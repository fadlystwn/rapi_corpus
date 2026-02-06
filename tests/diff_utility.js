const fs = require('fs');
const path = require('path');

class PromptDiffUtility {
  constructor() {
    this.goldenDir = 'tests/golden_prompts';
  }

  generateSideBySideDiff(current, golden) {
    const currentLines = current.split('\n');
    const goldenLines = golden.split('\n');
    const maxLines = Math.max(currentLines.length, goldenLines.length);
    
    let diff = '';
    diff += '='.repeat(120) + '\n';
    diff += 'CURRENT PROMPT'.padEnd(58) + ' | ' + 'GOLDEN PROMPT'.padEnd(58) + '\n';
    diff += '='.repeat(120) + '\n';
    
    for (let i = 0; i < maxLines; i++) {
      const currentLine = currentLines[i] || '';
      const goldenLine = goldenLines[i] || '';
      
      if (currentLine === goldenLine) {
        diff += currentLine.padEnd(58) + ' | ' + goldenLine.padEnd(58) + '\n';
      } else {
        diff += '\x1b[31m' + currentLine.padEnd(58) + '\x1b[0m | ';
        diff += '\x1b[32m' + goldenLine.padEnd(58) + '\x1b[0m\n';
      }
    }
    
    return diff;
  }

  generateUnifiedDiff(current, golden, testName) {
    const currentLines = current.split('\n');
    const goldenLines = golden.split('\n');
    
    let diff = `--- a/${testName}_golden\n`;
    diff += `+++ b/${testName}_current\n`;
    
    // Simple line-by-line comparison
    let currentIdx = 0;
    let goldenIdx = 0;
    
    while (currentIdx < currentLines.length || goldenIdx < goldenLines.length) {
      const currentLine = currentLines[currentIdx];
      const goldenLine = goldenLines[goldenIdx];
      
      if (currentLine === goldenLine) {
        diff += ` ${currentLine}\n`;
        currentIdx++;
        goldenIdx++;
      } else if (!currentLine) {
        diff += `-${goldenLine}\n`;
        goldenIdx++;
      } else if (!goldenLine) {
        diff += `+${currentLine}\n`;
        currentIdx++;
      } else {
        diff += `-${goldenLine}\n`;
        diff += `+${currentLine}\n`;
        currentIdx++;
        goldenIdx++;
      }
    }
    
    return diff;
  }

  analyzeChunkDifferences(currentMetadata, goldenMetadata) {
    const currentChunks = currentMetadata.used_chunk_ids || [];
    const goldenChunks = goldenMetadata.used_chunk_ids || [];
    
    const analysis = {
      totalCurrent: currentChunks.length,
      totalGolden: goldenChunks.length,
      added: [],
      removed: [],
      reordered: false,
      chunkDetails: {}
    };

    // Find added chunks
    analysis.added = currentChunks.filter(id => !goldenChunks.includes(id));
    
    // Find removed chunks
    analysis.removed = goldenChunks.filter(id => !currentChunks.includes(id));
    
    // Check if order changed
    const commonChunks = currentChunks.filter(id => goldenChunks.includes(id));
    const goldenOrder = goldenChunks.filter(id => currentChunks.includes(id));
    analysis.reordered = JSON.stringify(commonChunks) !== JSON.stringify(goldenOrder);

    // Load chunk details for reporting
    analysis.chunkDetails = this.loadChunkDetails([...analysis.added, ...analysis.removed]);
    
    return analysis;
  }

  loadChunkDetails(chunkIds) {
    const chunksDir = 'processed/chunks';
    const details = {};
    
    if (!fs.existsSync(chunksDir)) {
      return details;
    }
    
    const files = fs.readdirSync(chunksDir).filter(f => f.endsWith('.json'));
    
    files.forEach(file => {
      const chunkData = JSON.parse(fs.readFileSync(path.join(chunksDir, file), 'utf8'));
      chunkData.chunks.forEach(chunk => {
        if (chunkIds.includes(chunk.chunk_id)) {
          details[chunk.chunk_id] = {
            title: chunk.title,
            type: chunkData.type,
            priority: chunk.priority,
            tags: chunk.tags
          };
        }
      });
    });
    
    return details;
  }

  generateDetailedReport(testName, currentData, goldenData) {
    let report = `# Detailed Prompt Analysis: ${testName}\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;
    
    // Basic comparison
    report += `## 📊 Basic Comparison\n\n`;
    report += `- **Hash Match:** ${currentData.hash === goldenData.hash ? '✅' : '❌'}\n`;
    report += `- **Response Mode:** ${currentData.response_mode === goldenData.responseMode ? '✅' : '❌'} \`${currentData.response_mode}\` vs \`${goldenData.responseMode}\`\n`;
    report += `- **Prompt Length:** ${currentData.prompt.length} vs ${goldenData.prompt.length} chars\n\n`;
    
    // Chunk analysis
    const chunkAnalysis = this.analyzeChunkDifferences(currentData.metadata, goldenData.metadata);
    report += `## 🧩 Chunk Analysis\n\n`;
    report += `- **Total Chunks:** ${chunkAnalysis.totalCurrent} (current) vs ${chunkAnalysis.totalGolden} (golden)\n`;
    report += `- **Added Chunks:** ${chunkAnalysis.added.length}\n`;
    report += `- **Removed Chunks:** ${chunkAnalysis.removed.length}\n`;
    report += `- **Reordered:** ${chunkAnalysis.reordered ? '⚠️ Yes' : '✅ No'}\n\n`;
    
    if (chunkAnalysis.added.length > 0) {
      report += `### ➕ Added Chunks\n\n`;
      chunkAnalysis.added.forEach(chunkId => {
        const detail = chunkAnalysis.chunkDetails[chunkId];
        report += `- **${chunkId}**: ${detail?.title || 'Unknown'} (${detail?.type || 'Unknown'})\n`;
      });
      report += '\n';
    }
    
    if (chunkAnalysis.removed.length > 0) {
      report += `### ➖ Removed Chunks\n\n`;
      chunkAnalysis.removed.forEach(chunkId => {
        const detail = chunkAnalysis.chunkDetails[chunkId];
        report += `- **${chunkId}**: ${detail?.title || 'Unknown'} (${detail?.type || 'Unknown'})\n`;
      });
      report += '\n';
    }
    
    // Section analysis
    const currentSections = this.extractSections(currentData.prompt);
    const goldenSections = this.extractSections(goldenData.prompt);
    
    report += `## 📑 Section Analysis\n\n`;
    const allSections = [...new Set([...currentSections, ...goldenSections])];
    
    allSections.forEach(section => {
      const currentHas = currentSections.includes(section);
      const goldenHas = goldenSections.includes(section);
      
      if (currentHas && goldenHas) {
        report += `- ✅ ${section}\n`;
      } else if (currentHas && !goldenHas) {
        report += `- ➕ ${section} (added)\n`;
      } else if (!currentHas && goldenHas) {
        report += `- ➖ ${section} (removed)\n`;
      }
    });
    
    return report;
  }

  extractSections(prompt) {
    const sectionRegex = /^## (.+)$/gm;
    const sections = [];
    let match;
    
    while ((match = sectionRegex.exec(prompt)) !== null) {
      sections.push(match[1]);
    }
    
    return sections;
  }

  saveDiffReport(testName, report) {
    const reportsDir = 'tests/diff_reports';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const filename = `${testName}_diff_report.md`;
    const filepath = path.join(reportsDir, filename);
    
    fs.writeFileSync(filepath, report);
    console.log(`📄 Diff report saved: ${filename}`);
    
    return filepath;
  }

  generateHTMLDiff(current, golden, testName) {
    const currentLines = current.split('\n');
    const goldenLines = golden.split('\n');
    const maxLines = Math.max(currentLines.length, goldenLines.length);
    
    let html = `
<!DOCTYPE html>
<html>
<head>
    <title>Prompt Diff: ${testName}</title>
    <style>
        body { font-family: monospace; margin: 20px; }
        .header { background: #f0f0f0; padding: 10px; margin-bottom: 20px; }
        .diff-line { display: flex; }
        .line-number { width: 50px; text-align: right; padding-right: 10px; color: #666; }
        .current { width: 50%; padding: 2px 5px; }
        .golden { width: 50%; padding: 2px 5px; }
        .changed { background-color: #ffe6e6; }
        .added { background-color: #e6ffe6; }
        .removed { background-color: #ffe6e6; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Prompt Diff: ${testName}</h1>
        <p>Generated: ${new Date().toISOString()}</p>
    </div>
`;
    
    for (let i = 0; i < maxLines; i++) {
      const currentLine = currentLines[i] || '';
      const goldenLine = goldenLines[i] || '';
      const isChanged = currentLine !== goldenLine;
      
      html += `<div class="diff-line ${isChanged ? 'changed' : ''}">`;
      html += `<div class="line-number">${i + 1}</div>`;
      html += `<div class="current ${isChanged && !goldenLine ? 'added' : ''}">${this.escapeHtml(currentLine) || '&nbsp;'}</div>`;
      html += `<div class="golden ${isChanged && !currentLine ? 'removed' : ''}">${this.escapeHtml(goldenLine) || '&nbsp;'}</div>`;
      html += `</div>`;
    }
    
    html += `</body></html>`;
    
    return html;
  }

  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

module.exports = PromptDiffUtility;
