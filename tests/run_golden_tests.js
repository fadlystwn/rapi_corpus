#!/usr/bin/env node

const GoldenPromptTester = require('./golden_prompt_tester.js');
const PromptDiffUtility = require('./diff_utility.js');
const fs = require('fs');
const path = require('path');

class GoldenTestRunner {
  constructor() {
    this.tester = new GoldenPromptTester();
    this.diffUtil = new PromptDiffUtility();
  }

  printUsage() {
    console.log(`
🧪 Golden Prompt Test Runner

Usage: node run_golden_tests.js [command] [options]

Commands:
  test                    Run all golden prompt tests
  test <name>            Run specific test by name
  capture <name> <input>  Capture new golden prompt
  update                 Update all golden prompts with current output
  diff <name>            Generate diff report for specific test
  report                 Generate comprehensive report
  list                   List all available golden prompts

Options:
  --verbose              Show detailed output
  --html                 Generate HTML diff reports
  --force                Force update without confirmation

Examples:
  node run_golden_tests.js test
  node run_golden_tests.js test pain_point_boss_sindir
  node run_golden_tests.js diff pain_point_boss_sindir
  node run_golden_tests.js update --force
`);
  }

  runAllTests(options = {}) {
    console.log('🚀 Running Golden Prompt Test Suite\n');
    
    const results = this.tester.runAllGoldenTests(false);
    
    if (options.verbose) {
      results.results.forEach(result => {
        console.log(`\n📋 ${result.testName}:`);
        console.log(`   Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
        
        if (!result.passed && result.comparison) {
          const comp = result.comparison;
          if (comp.addedChunks.length > 0) {
            console.log(`   Added: ${comp.addedChunks.join(', ')}`);
          }
          if (comp.removedChunks.length > 0) {
            console.log(`   Removed: ${comp.removedChunks.join(', ')}`);
          }
        }
      });
    }

    // Generate summary report
    this.generateSummaryReport(results);
    
    // Exit with appropriate code
    if (results.summary.failed > 0) {
      console.log(`\n❌ ${results.summary.failed} test(s) failed. Check reports for details.`);
      process.exit(1);
    } else {
      console.log(`\n✅ All ${results.summary.passed} test(s) passed!`);
      process.exit(0);
    }
  }

  runSingleTest(testName, options = {}) {
    console.log(`🧪 Running single test: ${testName}\n`);
    
    const result = this.tester.runGoldenTest(testName, this.tester.getTestInput(testName));
    
    if (options.verbose && !result.passed) {
      console.log('\n📊 Detailed Analysis:');
      this.printDetailedAnalysis(result);
    }
    
    if (options.html && !result.passed) {
      this.generateHTMLDiff(testName, result.currentData, result.goldenData);
    }
    
    return result.passed ? 0 : 1;
  }

  generateDiffReport(testName) {
    console.log(`📄 Generating diff report: ${testName}\n`);
    
    try {
      const result = this.tester.runGoldenTest(testName, this.tester.getTestInput(testName));
      
      if (!result.goldenData) {
        console.log('❌ No golden prompt found to compare against');
        return 1;
      }
      
      const report = this.diffUtil.generateDetailedReport(
        testName, 
        result.currentData, 
        result.goldenData
      );
      
      const reportPath = this.diffUtil.saveDiffReport(testName, report);
      console.log(`✅ Diff report saved to: ${reportPath}`);
      
      return 0;
    } catch (error) {
      console.log(`❌ Error generating report: ${error.message}`);
      return 1;
    }
  }

  updateGoldenPrompts(options = {}) {
    if (!options.force) {
      console.log('⚠️  This will overwrite all golden prompts with current output.');
      console.log('Are you sure? Use --force to confirm.');
      return 1;
    }
    
    console.log('🔄 Updating all golden prompts...\n');
    
    const results = this.tester.runAllGoldenTests(true);
    
    console.log(`✅ Updated ${results.summary.total} golden prompts`);
    return 0;
  }

  captureGoldenPrompt(name, input) {
    if (!name || !input) {
      console.log('❌ Both name and input are required');
      return 1;
    }
    
    console.log(`📸 Capturing golden prompt: ${name}\n`);
    
    this.tester.captureGoldenPrompt(name, input, {
      description: `Manual capture: ${name}`,
      version: '1.0'
    });
    
    console.log('✅ Golden prompt captured successfully');
    return 0;
  }

  generateSummaryReport(results) {
    const reportDir = 'test_reports';
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    let report = `# Golden Prompt Test Report\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n`;
    report += `**Total Tests:** ${results.summary.total}\n`;
    report += `**Passed:** ${results.summary.passed}\n`;
    report += `**Failed:** ${results.summary.failed}\n\n`;
    
    report += `## Test Results\n\n`;
    results.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      report += `${status} **${result.testName}**\n`;
      
      if (!result.passed && result.comparison) {
        const comp = result.comparison;
        if (comp.addedChunks.length > 0) {
          report += `   - Added: ${comp.addedChunks.join(', ')}\n`;
        }
        if (comp.removedChunks.length > 0) {
          report += `   - Removed: ${comp.removedChunks.join(', ')}\n`;
        }
      }
      report += '\n';
    });
    
    const reportPath = path.join(reportDir, `golden_test_report_${Date.now()}.md`);
    fs.writeFileSync(reportPath, report);
    
    console.log(`📊 Summary report saved: ${reportPath}`);
  }

  generateHTMLDiff(testName, currentData, goldenData) {
    const html = this.diffUtil.generateHTMLDiff(
      currentData.prompt, 
      goldenData.prompt, 
      testName
    );
    
    const reportsDir = 'test_reports';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const htmlPath = path.join(reportsDir, `${testName}_diff.html`);
    fs.writeFileSync(htmlPath, html);
    
    console.log(`🌐 HTML diff saved: ${htmlPath}`);
  }

  printDetailedAnalysis(result) {
    if (!result.comparison) return;
    
    const comp = result.comparison;
    console.log(`   Hash Match: ${comp.hashMatch ? '✅' : '❌'}`);
    console.log(`   Response Mode: ${comp.responseModeMatch ? '✅' : '❌'}`);
    
    if (comp.addedChunks.length > 0) {
      console.log(`   Added Chunks (${comp.addedChunks.length}):`);
      comp.addedChunks.forEach(chunk => {
        console.log(`     - ${chunk}`);
      });
    }
    
    if (comp.removedChunks.length > 0) {
      console.log(`   Removed Chunks (${comp.removedChunks.length}):`);
      comp.removedChunks.forEach(chunk => {
        console.log(`     - ${chunk}`);
      });
    }
    
    if (comp.changedSections.length > 0) {
      console.log(`   Changed Sections:`);
      comp.changedSections.forEach(change => {
        console.log(`     - ${change.section} (${change.type})`);
      });
    }
  }

  listGoldenPrompts() {
    const goldenDir = 'tests/golden_prompts';
    
    if (!fs.existsSync(goldenDir)) {
      console.log('❌ No golden prompts directory found');
      return 1;
    }
    
    const files = fs.readdirSync(goldenDir).filter(f => f.endsWith('.json'));
    
    if (files.length === 0) {
      console.log('📝 No golden prompts found');
      return 0;
    }
    
    console.log(`📋 Found ${files.length} golden prompts:\n`);
    
    files.forEach(file => {
      const filepath = path.join(goldenDir, file);
      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      
      console.log(`📄 ${data.testName}`);
      console.log(`   Input: "${data.input}"`);
      console.log(`   Description: ${data.description || 'No description'}`);
      console.log(`   Created: ${data.timestamp}`);
      console.log(`   Response Mode: ${data.responseMode}`);
      console.log(`   Chunks: ${data.metadata.used_chunk_ids?.length || 0}`);
      console.log('');
    });
    
    return 0;
  }

  run() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    const options = {
      verbose: args.includes('--verbose'),
      html: args.includes('--html'),
      force: args.includes('--force')
    };
    
    // Filter out options for commands that need clean args
    const cleanArgs = args.filter(arg => !arg.startsWith('--'));
    
    switch (command) {
      case 'test':
        if (cleanArgs[1]) {
          process.exit(this.runSingleTest(cleanArgs[1], options));
        } else {
          process.exit(this.runAllTests(options));
        }
        
      case 'diff':
        if (!cleanArgs[1]) {
          console.log('❌ Test name required for diff command');
          this.printUsage();
          process.exit(1);
        }
        process.exit(this.generateDiffReport(cleanArgs[1]));
        
      case 'update':
        process.exit(this.updateGoldenPrompts(options));
        
      case 'capture':
        if (!cleanArgs[1] || !cleanArgs[2]) {
          console.log('❌ Both name and input required for capture command');
          this.printUsage();
          process.exit(1);
        }
        process.exit(this.captureGoldenPrompt(cleanArgs[1], cleanArgs.slice(2).join(' ')));
        
      case 'list':
        process.exit(this.listGoldenPrompts());
        
      case 'report':
        console.log('📊 Generating comprehensive report...');
        const results = this.tester.runAllGoldenTests(false);
        this.generateSummaryReport(results);
        process.exit(0);
        
      default:
        this.printUsage();
        process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new GoldenTestRunner();
  runner.run();
}

module.exports = GoldenTestRunner;
