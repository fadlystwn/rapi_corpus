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

  isWorkplaceScenario(processedInput) {
    const workplaceKeywords = [
      'atasan', 'boss', 'manager', 'tim', 'team', 'rekan', 'kolega',
      'komunikasi kerja', 'meeting', 'rapat', 'project', 'proyek',
      'deadline', 'kantor', 'office', 'kerja', 'pekerjaan',
      'bawahan', 'senior', 'junior', 'klien', 'client',
      'presentasi', 'laporan', 'report', 'feedback'
    ];

    const workplaceIntents = ['communication_help', 'problem_description', 'advice_seeking'];

    const hasWorkplaceKeyword = workplaceKeywords.some(keyword => 
      processedInput.normalized_input.includes(keyword)
    );

    const hasWorkplaceIntent = workplaceIntents.includes(processedInput.intent);
    const hasRoleContext = processedInput.role_context !== null;

    return hasWorkplaceKeyword && (hasWorkplaceIntent || hasRoleContext);
  }

  performRetrieval(processedInput) {
    const retrievedChunks = [];
    const usedChunkIds = new Set();
    const excludedChunkIds = new Set();

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
      true;
    
    return hasTriggerKeyword && meetsRiskLevel;
  }

  compareRiskLevel(current, minimum) {
    const levels = { low: 1, medium: 2, high: 3 };
    return levels[current] >= levels[minimum];
  }

  getChunksByType(chunkType) {
    if (!chunkType) return [];
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
    
    prompt += sections.map(section => section.content).join(this.promptContract.assembly_rules.section_separator);
    
    // ── REFINED: Instruksi akhir yang ketat dan tidak ambigu ──
    prompt += `\n---\n\n`;
    prompt += `ATURAN OUTPUT (wajib diikuti, tidak ada pengecualian):\n`;
    prompt += `- Bahasa: Indonesia casual, boleh pakai "lo/gue", tanpa formalities\n`;
    prompt += `- Panjang: MAKSIMAL 2 kalimat. Bukan paragraf — kalimat.\n`;
    prompt += `- Dilarang: bullet list, heading, kata pembuka ("Tentu saja", "Baik", "Oke"), disclaimer, atau penjelasan panjang\n`;
    prompt += `- Isi: langsung ke trade-off atau tindakan. Tidak perlu validasi situasi user.\n`;
    prompt += `- Format wording (jika ada): tulis langsung teks yang bisa di-copy, tanpa embel-embel\n`;

    return {
      prompt: prompt,
      response_mode: 'guided',
      metadata: {
        sections_used: sections.map(s => s.name),
        total_tokens: this.estimateTokens(prompt)
      }
    };
  }

  generatePromptVariations(basePrompt, processedInput) {
    // Ambil base context (sebelum instruksi output)
    const baseSections = basePrompt.substring(0, basePrompt.indexOf('\n---\n'));

    // ── REFINED: Setiap variasi punya instruksi yang sangat ketat ──

    // Opsi A: Aman — satu kalimat posisi + satu kalimat trade-off
    const safePrompt = `${baseSections}
---

OPSI A — AMAN:
Tulis TEPAT 2 kalimat dalam bahasa Indonesia casual.
Kalimat 1: Apa yang harus dilakukan (pendekatan konservatif, tidak konfrontatif).
Kalimat 2: Trade-off-nya dalam satu frasa — posisi stagnan, progres lambat, atau terlihat pasif.
Jangan tambahkan penjelasan, list, atau kalimat ketiga.`;

    // Opsi B: Assertive — satu kalimat tindakan + satu kalimat risiko
    const assertivePrompt = `${baseSections}
---

OPSI B — ASSERTIVE:
Tulis TEPAT 2 kalimat dalam bahasa Indonesia casual.
Kalimat 1: Apa yang harus dilakukan (proaktif, langsung, visible).
Kalimat 2: Risiko realistisnya dalam satu frasa — gesekan kecil, atau potensi pushback.
Jangan tambahkan penjelasan, list, atau kalimat ketiga.`;

    // Rekomendasi — pilih opsi + exact wording siap pakai
    const recommendationPrompt = `${baseSections}
---

REKOMENDASI:
Tulis dalam format TEPAT ini — tidak lebih, tidak kurang:

"Opsi [A/B], dengan wording: '[tulis kalimat yang bisa langsung dipakai user]'"

Lalu tambahkan SATU kalimat pendek alasan kenapa opsi itu lebih cocok untuk situasi ini.
Total: 2 baris. Tidak ada heading, tidak ada list.`;

    return [
      { type: 'safe', prompt: safePrompt },
      { type: 'assertive', prompt: assertivePrompt },
      { type: 'recommendation', prompt: recommendationPrompt }
    ];
  }

  createFallbackResponse(reason) {
    const fallbackConfig = this.promptContract.fallback_behavior;
    
    let response;
    switch (reason) {
      case 'missing_required_section':
        response = fallbackConfig.safe_response;
        break;
      case 'token_limit_exceeded':
        response = "Fokus ke opsi paling aman dulu — coba tanya lebih spesifik biar gue bisa bantu lebih detail.";
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
      const promptVariations = this.generatePromptVariations(promptResult.prompt, processedInput);
      
      const executionMetadata = {
        used_chunk_ids: retrievalResult.used_chunk_ids,
        excluded_chunk_ids: retrievalResult.excluded_chunk_ids,
        response_mode: promptResult.response_mode,
        risk_level: processedInput.risk_level,
        retrieval_rules_version: this.retrievalRules.version || '1.0',
        prompt_contract_version: this.promptContract.version || '1.0',
        is_workplace_scenario: true
      };

      return {
        prompt: promptResult.prompt,
        response_mode: promptResult.response_mode,
        metadata: executionMetadata,
        isWorkplaceScenario: true,
        promptVariations: promptVariations
      };
    } catch (error) {
      return {
        prompt: "Maaf, terjadi kesalahan. Coba ulangi dengan pertanyaan yang lebih spesifik.",
        response_mode: 'safe_generic',
        metadata: {
          error: error.message,
          response_mode: 'safe_generic'
        },
        isWorkplaceScenario: false,
        promptVariations: null
      };
    }
  }
}

function executeRetrieval(input) {
  const executor = new RetrievalExecutor();
  return executor.executeRetrieval(input);
}

module.exports = { RetrievalExecutor, executeRetrieval };