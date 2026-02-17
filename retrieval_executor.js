const fs = require('fs');
const path = require('path');

class RetrievalExecutor {
  constructor() {
    this.basePath = __dirname;
    this.retrievalRules = this.loadJSON(path.join(this.basePath, 'processed/retrieval_rules.json'));
    this.promptContract = this.loadJSON(path.join(this.basePath, 'processed/prompt_contract.json'));
    this.corpusIndex = this.loadJSON(path.join(this.basePath, 'processed/metadata/corpus_index.json'));
    this.chunks = this.loadAllChunks();
    this.embeddings = this.loadAllEmbeddings();
  }

  loadJSON(filePath) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
      throw new Error(`Failed to load ${filePath}: ${error.message}`);
    }
  }

  loadAllChunks() {
    const chunksDir = path.join(this.basePath, 'processed/chunks');
    const chunks = {};
    const files = fs.readdirSync(chunksDir);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const chunkData = this.loadJSON(path.join(chunksDir, file));
        for (const chunk of chunkData.chunks) {
          // Ensure document_type is set, prioritizing the type already in the chunk.
          if (!chunk.document_type) {
            chunk.document_type = chunkData.type;
          }
          chunks[chunk.chunk_id] = chunk;
        }
      }
    }
    return chunks;
  }

  loadAllEmbeddings() {
    const embeddingsDir = path.join(this.basePath, 'processed/embeddings');
    const embeddings = {};
    const files = fs.readdirSync(embeddingsDir);
    
    for (const file of files) {
      if (file.endsWith('.vec.json')) {
        const embeddingData = this.loadJSON(path.join(embeddingsDir, file));
        for (const embedding of embeddingData.embeddings) {
          embeddings[embedding.chunk_id] = embedding.vector;
        }
      }
    }
    return embeddings;
  }

  preprocessInput(input) {
    const normalizedInput = input.toLowerCase().trim();
    const riskKeywords = ['risiko', 'bahaya', 'ancaman', 'konsekuensi', 'legal', 'hukum', 'komplain', 'resign'];
    const hasRiskKeywords = riskKeywords.some(keyword => normalizedInput.includes(keyword));
    
    let riskLevel = 'low';
    if (hasRiskKeywords) {
      riskLevel = normalizedInput.includes('ancaman') || normalizedInput.includes('legal') ? 'high' : 'medium';
    }

    const intent = this.detectIntent(normalizedInput);
    const roleContext = this.detectRoleContext(normalizedInput);

    return {
      normalized_input: normalizedInput,
      intent: intent,
      risk_level: riskLevel,
      role_context: roleContext
    };
  }

  detectIntent(input) {
    if (input.includes('bantuan') || input.includes('saran') || input.includes('cara')) {
      return 'advice_seeking';
    } else if (input.includes('situasi') || input.includes('masalah') || input.includes('dilema')) {
      return 'problem_description';
    } else if (input.includes('respons') || input.includes('balas') || input.includes('pesan')) {
      return 'communication_help';
    }
    return 'general_inquiry';
  }

  detectRoleContext(input) {
    if (input.includes('atasan') || input.includes('boss') || input.includes('manager')) {
      return 'subordinate';
    } else if (input.includes('bawahan') || input.includes('team') || input.includes('rekan')) {
      return 'superior_or_peer';
    }
    return null;
  }

  performRetrieval(processedInput) {
    const retrievedChunks = [];
    const usedChunkIds = new Set();
    const excludedChunkIds = new Set();

    // Always include required chunk types
    for (const chunkType of this.retrievalRules.always_include) {
      const chunks = this.getChunksByType(chunkType);
      const selectedChunks = this.selectTopChunks(chunks, this.retrievalRules.limits.max_chunks_per_type[chunkType] || 3);
      
      for (const chunk of selectedChunks) {
        if (!usedChunkIds.has(chunk.chunk_id)) {
          retrievedChunks.push(chunk);
          usedChunkIds.add(chunk.chunk_id);
        }
      }
    }

    // Conditional inclusion based on rules
    for (const chunkType in this.retrievalRules.conditional_include) {
      const config = this.retrievalRules.conditional_include[chunkType];
      if (this.shouldInclude(processedInput, config)) {
        const chunks = this.getChunksByType(chunkType);
        const selectedChunks = this.selectTopChunks(chunks, this.retrievalRules.limits.max_chunks_per_type[chunkType] || 2);
        
        for (const chunk of selectedChunks) {
          if (!usedChunkIds.has(chunk.chunk_id)) {
            retrievedChunks.push(chunk);
            usedChunkIds.add(chunk.chunk_id);
          }
        }
      }
    }

    // Similarity-based retrieval for allowed types
    for (const chunkType of this.retrievalRules.similarity_retrieval) {
      if (usedChunkIds.size >= this.retrievalRules.limits.max_chunks) break;
      
      const chunks = this.getChunksByType(chunkType);
      const similarityScores = this.calculateSimilarity(processedInput.normalized_input, chunks);
      const sortedChunks = chunks.sort((a, b) => {
        const scoreA = similarityScores[a.chunk_id] || 0;
        const scoreB = similarityScores[b.chunk_id] || 0;
        return scoreB - scoreA;
      });

      const maxTypeChunks = this.retrievalRules.limits.max_chunks_per_type[chunkType] || 3;
      const selectedChunks = sortedChunks.slice(0, maxTypeChunks);

      for (const chunk of selectedChunks) {
        if (!usedChunkIds.has(chunk.chunk_id) && usedChunkIds.size < this.retrievalRules.limits.max_chunks) {
          retrievedChunks.push(chunk);
          usedChunkIds.add(chunk.chunk_id);
        } else {
          excludedChunkIds.add(chunk.chunk_id);
        }
      }
    }


    return {
      retrieved_chunks: retrievedChunks,
      used_chunk_ids: Array.from(usedChunkIds),
      excluded_chunk_ids: Array.from(excludedChunkIds)
    };
  }

  shouldInclude(processedInput, config) {
    if (!config || !config.trigger_keywords) return false;

    const hasTriggerKeyword = config.trigger_keywords.some(keyword => 
      processedInput.normalized_input.includes(keyword)
    );
    
    const meetsRiskLevel = config.min_risk_level ? 
      this.compareRiskLevel(processedInput.risk_level, config.min_risk_level) :
      true; // If no min_risk_level is defined, it always passes this check
    
    return hasTriggerKeyword && meetsRiskLevel;
  }

  compareRiskLevel(current, minimum) {
    const levels = { low: 1, medium: 2, high: 3 };
    return levels[current] >= levels[minimum];
  }

  getChunksByType(chunkType) {
    if (!chunkType) return [];
    // Directly filter chunks by the provided chunkType.
    return Object.values(this.chunks).filter(chunk => chunk.document_type === chunkType);
  }

  selectTopChunks(chunks, maxCount) {
    return chunks.slice(0, Math.min(maxCount, chunks.length));
  }

  calculateSimilarity(input, chunks) {
    const scores = {};
    const inputWords = input.split(' ');
    
    for (const chunk of chunks) {
      const contentWords = chunk.content.toLowerCase().split(' ');
      const commonWords = inputWords.filter(word => contentWords.includes(word));
      scores[chunk.chunk_id] = commonWords.length / Math.max(inputWords.length, contentWords.length);
    }
    
    return scores;
  }

  assemblePrompt(retrievedChunks, processedInput) {
    const sections = [];
    let totalTokens = 0;

    for (const sectionConfig of this.promptContract.sections) {
      const sectionChunks = retrievedChunks.filter(chunk => 
        this.chunkMatchesSection(chunk, sectionConfig)
      );

      if (sectionConfig.required && sectionChunks.length === 0) {
        return this.createFallbackResponse('missing_required_section');
      }

      const sectionContent = this.buildSection(sectionConfig, sectionChunks);
      const sectionTokens = this.estimateTokens(sectionContent);
      
      if (totalTokens + sectionTokens > this.promptContract.assembly_rules.max_total_tokens) {
        if (sectionConfig.required) {
          return this.createFallbackResponse('token_limit_exceeded');
        }
        break;
      }

      sections.push({
        name: sectionConfig.name,
        content: sectionContent,
        chunks: sectionChunks
      });
      
      totalTokens += sectionTokens;
    }

    return this.buildFinalPrompt(sections, processedInput);
  }

  chunkMatchesSection(chunk, sectionConfig) {
    if (!sectionConfig.chunk_types || !chunk.document_type) {
      return false;
    }
    // Directly check if the chunk's document_type is included in the section's allowed chunk_types.
    return sectionConfig.chunk_types.includes(chunk.document_type);
  }

  buildSection(sectionConfig, chunks) {
    let content = `## ${sectionConfig.name}\n\n`;
    content += `${sectionConfig.instruction}\n\n`;
    
    for (const chunk of chunks) {
      content += `### ${chunk.title}\n${chunk.content}\n\n`;
    }
    
    return content;
  }

  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  buildFinalPrompt(sections, processedInput) {
    let prompt = `# RAPI Workplace Decision Assistant\n\n`;
    prompt += `User Input: ${processedInput.normalized_input}\n`;
    prompt += `Intent: ${processedInput.intent}\n`;
    prompt += `Risk Level: ${processedInput.risk_level}\n\n`;
    
    prompt += sections.map(section => 
      section.content
    ).join(this.promptContract.assembly_rules.section_separator);
    
    prompt += `\n---\n\nTulis jawaban akhir dalam Bahasa Indonesia gaya casual (seperti ngobrol; boleh pakai \"lo\"), tetap sopan, tidak sarkas. Batasi jawaban jadi maksimal 2–3 paragraf pendek, tanpa heading dan tanpa daftar panjang. Ikuti guardrails dan standar respons di atas.`;
    
    return {
      prompt: prompt,
      response_mode: 'guided',
      metadata: {
        sections_used: sections.map(s => s.name),
        total_tokens: this.estimateTokens(prompt)
      }
    };
  }

  createFallbackResponse(reason) {
    const fallbackConfig = this.promptContract.fallback_behavior;
    
    let response;
    switch (reason) {
      case 'missing_required_section':
        response = fallbackConfig.safe_response;
        break;
      case 'token_limit_exceeded':
        response = "Saya tidak bisa memberikan saran lengkap karena batasan panjang. Mari kita fokus pada opsi komunikasi yang paling aman.";
        break;
      default:
        response = fallbackConfig.safe_response;
    }
    
    return {
      prompt: response,
      response_mode: 'safe_generic',
      metadata: {
        fallback_reason: reason,
        sections_used: []
      }
    };
  }

  executeRetrieval(input) {
    try {
      const processedInput = this.preprocessInput(input);
      const retrievalResult = this.performRetrieval(processedInput);
      const promptResult = this.assemblePrompt(retrievalResult.retrieved_chunks, processedInput);
      
      const executionMetadata = {
        used_chunk_ids: retrievalResult.used_chunk_ids,
        excluded_chunk_ids: retrievalResult.excluded_chunk_ids,
        response_mode: promptResult.response_mode,
        risk_level: processedInput.risk_level,
        retrieval_rules_version: this.retrievalRules.version || '1.0',
        prompt_contract_version: this.promptContract.version || '1.0'
      };

      return {
        prompt: promptResult.prompt,
        response_mode: promptResult.response_mode,
        metadata: executionMetadata
      };
    } catch (error) {
      return {
        prompt: "Maaf, terjadi kesalahan dalam memproses permintaan Anda. Silakan coba lagi dengan pertanyaan yang lebih spesifik.",
        response_mode: 'safe_generic',
        metadata: {
          error: error.message,
          response_mode: 'safe_generic'
        }
      };
    }
  }
}

function executeRetrieval(input) {
  const executor = new RetrievalExecutor();
  return executor.executeRetrieval(input);
}

module.exports = { RetrievalExecutor, executeRetrieval };
