const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class GoldenPromptTester {
  constructor() {
    this.goldenDir = 'tests/golden_prompts';
    this.retrievalExecutor = require('../retrieval_executor.js');
    this.ensureGoldenDir();
  }

  ensureGoldenDir() {
    if (!fs.existsSync(this.goldenDir)) {
      fs.mkdirSync(this.goldenDir, { recursive: true });
    }
  }

  generateHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  sanitizeFilename(input) {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
  }

  captureGoldenPrompt(testName, input, options = {}) {
    const executor = new this.retrievalExecutor.RetrievalExecutor();
    const result = executor.executeRetrieval(input);
    
    const goldenData = {
      testName,
      input,
      prompt: result.prompt,
      responseMode: result.response_mode,
      metadata: result.metadata,
      hash: this.generateHash(result.prompt),
      timestamp: new Date().toISOString(),
      version: options.version || '1.0',
      description: options.description || ''
    };

    const filename = `${this.sanitizeFilename(testName)}.json`;
    const filepath = path.join(this.goldenDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(goldenData, null, 2));
    console.log(`✅ Golden prompt captured: ${filename}`);
    
    return goldenData;
  }

  loadGoldenPrompt(testName) {
    const filename = `${this.sanitizeFilename(testName)}.json`;
    const filepath = path.join(this.goldenDir, filename);
    
    if (!fs.existsSync(filepath)) {
      throw new Error(`Golden prompt not found: ${testName}`);
    }
    
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  }

  comparePrompts(current, golden) {
    const differences = {
      hashMatch: current.hash === golden.hash,
      promptMatch: current.prompt === golden.prompt,
      responseModeMatch: current.response_mode === golden.responseMode,
      metadataMatch: JSON.stringify(current.metadata) === JSON.stringify(golden.metadata),
      addedChunks: [],
      removedChunks: [],
      changedSections: []
    };

    if (!differences.hashMatch) {
      // Analyze chunk differences
      const currentChunks = current.metadata.used_chunk_ids || [];
      const goldenChunks = golden.metadata.used_chunk_ids || [];
      
      differences.addedChunks = currentChunks.filter(id => !goldenChunks.includes(id));
      differences.removedChunks = goldenChunks.filter(id => !currentChunks.includes(id));
    }

    if (!differences.promptMatch) {
      // Simple section-based diff
      differences.changedSections = this.findChangedSections(current.prompt, golden.prompt);
    }

    return differences;
  }

  findChangedSections(current, golden) {
    const sections = ['## GUARDRAILS', '## RESPONSE_STANDARD', '## RISK_HANDLING', 
                     '## DECISION_LOGIC', '## USER_CONTEXT', '## COMMUNICATION_STYLE'];
    const changes = [];

    sections.forEach(section => {
      const currentHas = current.includes(section);
      const goldenHas = golden.includes(section);
      
      if (currentHas !== goldenHas) {
        changes.push({
          section,
          type: currentHas ? 'added' : 'removed'
        });
      }
    });

    return changes;
  }

  runGoldenTest(testName, input, updateGolden = false) {
    console.log(`\n🧪 Running golden test: ${testName}`);
    
    const executor = new this.retrievalExecutor.RetrievalExecutor();
    const currentResult = executor.executeRetrieval(input);
    
    const currentData = {
      prompt: currentResult.prompt,
      response_mode: currentResult.response_mode,
      metadata: currentResult.metadata,
      hash: this.generateHash(currentResult.prompt)
    };

    try {
      const goldenData = this.loadGoldenPrompt(testName);
      const comparison = this.comparePrompts(currentData, goldenData);
      
      console.log(`📊 Hash Match: ${comparison.hashMatch ? '✅' : '❌'}`);
      console.log(`📝 Response Mode: ${comparison.responseModeMatch ? '✅' : '❌'}`);
      
      if (!comparison.hashMatch) {
        console.log(`⚠️  Prompt drift detected!`);
        if (comparison.addedChunks.length > 0) {
          console.log(`   Added chunks: ${comparison.addedChunks.join(', ')}`);
        }
        if (comparison.removedChunks.length > 0) {
          console.log(`   Removed chunks: ${comparison.removedChunks.join(', ')}`);
        }
        if (comparison.changedSections.length > 0) {
          console.log(`   Changed sections: ${comparison.changedSections.map(s => s.section).join(', ')}`);
        }
      }

      if (updateGolden) {
        this.captureGoldenPrompt(testName, input, {
          version: goldenData.version,
          description: goldenData.description
        });
        console.log(`🔄 Golden prompt updated for: ${testName}`);
      }

      return {
        testName,
        passed: comparison.hashMatch,
        comparison,
        currentData,
        goldenData
      };

    } catch (error) {
      if (error.message.includes('not found')) {
        console.log(`📝 No golden prompt found. Creating new one...`);
        this.captureGoldenPrompt(testName, input);
        return {
          testName,
          passed: false,
          reason: 'No golden prompt exists',
          currentData
        };
      }
      throw error;
    }
  }

  runAllGoldenTests(updateGolden = false) {
    const testCases = [
      {
        name: 'pain_point_boss_sindir',
        input: 'bos saya sindir di group chat',
        description: 'Pain point: boss criticizing in public chat'
      },
      {
        name: 'pain_point_instruksi_ambigu',
        input: 'atasan kasih instruksi ambigu',
        description: 'Pain point: ambiguous instruction from boss'
      },
      {
        name: 'high_risk_legal',
        input: 'bagaimana cara menghadapi kasus hukum di kantor',
        description: 'High risk: legal scenario at workplace'
      },
      {
        name: 'out_of_domain',
        input: 'bagaimana cara investasi saham',
        description: 'Out of domain: investment advice'
      },
      {
        name: 'normal_communication',
        input: 'cara menulis email profesional',
        description: 'Normal: professional email writing'
      }
    ];

    console.log(`🚀 Running ${testCases.length} golden prompt tests...\n`);
    
    const results = [];
    let passed = 0;
    let failed = 0;

    testCases.forEach(testCase => {
      const result = this.runGoldenTest(testCase.name, testCase.input, updateGolden);
      results.push(result);
      
      if (result.passed) {
        passed++;
        console.log(`✅ ${testCase.name}: PASSED`);
      } else {
        failed++;
        console.log(`❌ ${testCase.name}: FAILED${result.reason ? ` (${result.reason})` : ''}`);
      }
    });

    console.log(`\n📈 Summary: ${passed} passed, ${failed} failed`);
    
    return {
      summary: { passed, failed, total: testCases.length },
      results
    };
  }

  generateDiffReport(testName) {
    const result = this.runGoldenTest(testName, this.getTestInput(testName));
    
    if (!result.goldenData) {
      return 'No golden prompt to compare against';
    }

    let report = `# Golden Prompt Diff Report: ${testName}\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;
    
    if (result.comparison.hashMatch) {
      report += `## ✅ No Changes Detected\n\nPrompts are identical.\n`;
    } else {
      report += `## ⚠️ Changes Detected\n\n`;
      
      if (result.comparison.addedChunks.length > 0) {
        report += `### Added Chunks\n\`${result.comparison.addedChunks.join(', ')}\`\n\n`;
      }
      
      if (result.comparison.removedChunks.length > 0) {
        report += `### Removed Chunks\n\`${result.comparison.removedChunks.join(', ')}\`\n\n`;
      }
      
      if (result.comparison.changedSections.length > 0) {
        report += `### Changed Sections\n`;
        result.comparison.changedSections.forEach(change => {
          report += `- ${change.section} (${change.type})\n`;
        });
        report += '\n';
      }
    }

    return report;
  }

  getTestInput(testName) {
    const testCases = {
      'pain_point_boss_sindir': 'bos saya sindir di group chat',
      'pain_point_instruksi_ambigu': 'atasan kasih instruksi ambigu',
      'high_risk_legal': 'bagaimana cara menghadapi kasus hukum di kantor',
      'out_of_domain': 'bagaimana cara investasi saham',
      'normal_communication': 'cara menulis email profesional'
    };
    
    return testCases[testName] || testName;
  }
}

module.exports = GoldenPromptTester;
