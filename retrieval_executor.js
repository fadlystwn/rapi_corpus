const fs = require('fs');
const path = require('path');

class RetrievalExecutor {
  constructor() {
    this.retrievalRules = this.loadJSON('processed/retrieval_rules.json');
    this.promptContract = this.loadJSON('processed/prompt_contract.json');
    this.corpusIndex = this.loadJSON('processed/metadata/corpus_index.json');
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
    const chunksDir = 'processed/chunks';
    const chunks = {};
    const files = fs.readdirSync(chunksDir);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const chunkData = this.loadJSON(path.join(chunksDir, file));
        for (const chunk of chunkData.chunks) {
          // Add document type to each chunk
          chunk.document_type = chunkData.type;
          chunks[chunk.chunk_id] = chunk;
        }
      }
    }
    return chunks;
  }

  loadAllEmbeddings() {
    const embeddingsDir = 'processed/embeddings';
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

    // Conditional inclusion for risk patterns
    if (this.shouldIncludeRiskPatterns(processedInput)) {
      const riskChunks = this.getChunksByType('risk_matrix');
      const selectedRiskChunks = this.selectTopChunks(riskChunks, this.retrievalRules.limits.max_chunks_per_type.risk_matrix || 2);
      
      for (const chunk of selectedRiskChunks) {
        if (!usedChunkIds.has(chunk.chunk_id)) {
          retrievedChunks.push(chunk);
          usedChunkIds.add(chunk.chunk_id);
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

  shouldIncludeRiskPatterns(processedInput) {
    const riskConfig = this.retrievalRules.conditional_include.risk_matrix;
    const hasTriggerKeyword = riskConfig.trigger_keywords.some(keyword => 
      processedInput.normalized_input.includes(keyword)
    );
    
    const meetsRiskLevel = this.compareRiskLevel(processedInput.risk_level, riskConfig.min_risk_level);
    
    return hasTriggerKeyword && meetsRiskLevel;
  }

  compareRiskLevel(current, minimum) {
    const levels = { low: 1, medium: 2, high: 3 };
    return levels[current] >= levels[minimum];
  }

  getChunksByType(chunkType) {
    const typeMapping = {
      'guardrails': 'guardrails',
      'response_standards': 'response_standards',
      'risk_matrix': 'risk_matrix',
      'pain_points': 'pain_points',
      'decision_principles': 'decision_principles',
      'communication_patterns': 'communication_patterns'
    };

    const mappedType = typeMapping[chunkType];
    if (!mappedType) return [];

    return Object.values(this.chunks).filter(chunk => {
      // Primary check: document_type - this is the most reliable method
      if (chunk.document_type === mappedType) return true;
      
      // Secondary check: only use tag matching for chunks without document_type
      // This should be rare but provides backward compatibility
      if (!chunk.document_type && chunk.tags) {
        return chunk.tags.some(tag => {
          const tagLower = tag.toLowerCase();
          const typeLower = mappedType.toLowerCase();
          
          // Handle singular/plural variations - be more specific
          if (typeLower === 'guardrails' && tagLower === 'guardrail') return true;
          if (typeLower === 'response_standards' && tagLower === 'standard') return true;
          if (typeLower === 'risk_matrix' && tagLower === 'risk') return true;
          if (typeLower === 'pain_points' && tagLower === 'pain_point') return true;
          if (typeLower === 'decision_principles' && (tagLower === 'decision' || tagLower === 'principle')) return true;
          if (typeLower === 'communication_patterns' && (tagLower === 'communication' || tagLower === 'pattern')) return true;
          
          return false;
        });
      }
      
      return false;
    });
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
    const typeMapping = {
      'SYSTEM_GUARDRAILS': ['guardrails'],
      'RESPONSE_STANDARD': ['response_standards'],
      'RISK_HANDLING': ['risk_matrix'],
      'DECISION_LOGIC': ['decision_principles'],
      'USER_CONTEXT': ['pain_points'],
      'COMMUNICATION_STYLE': ['communication_patterns']
    };

    const expectedTypes = typeMapping[sectionConfig.name];
    if (!expectedTypes) return false;

    return expectedTypes.some(type => {
      // Check by document type first
      if (chunk.document_type === type) return true;
      
      // Then check by tags
      return chunk.tags && chunk.tags.some(tag => {
        const tagLower = tag.toLowerCase();
        const typeLower = type.toLowerCase();
        
        // Handle singular/plural variations
        if (typeLower === 'guardrails' && tagLower.includes('guardrail')) return true;
        if (typeLower === 'response_standards' && tagLower.includes('standard')) return true;
        if (typeLower === 'risk_matrix' && tagLower.includes('risk')) return true;
        if (typeLower === 'pain_points' && tagLower.includes('pain')) return true;
        if (typeLower === 'decision_principles' && (tagLower.includes('decision') || tagLower.includes('principle'))) return true;
        if (typeLower === 'communication_patterns' && (tagLower.includes('communication') || tagLower.includes('pattern'))) return true;
        
        return false;
      });
    });
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
