# Golden Prompt Testing Framework

This framework prevents accidental prompt drift by maintaining snapshots of expected prompt outputs and detecting changes.

## 🎯 Purpose

- **Prevent Prompt Drift**: Detect when code changes affect prompt generation
- **Snapshot Testing**: Maintain baseline prompts for key scenarios
- **Diff Analysis**: Detailed comparison of current vs expected outputs
- **Automated Testing**: CI/CD integration for prompt integrity

## 📁 Structure

```
tests/
├── golden_prompt_tester.js    # Core testing framework
├── diff_utility.js           # Diff analysis utilities
├── run_golden_tests.js       # CLI test runner
├── golden_prompts/           # Baseline prompt snapshots
│   ├── pain_point_boss_sindir.json
│   ├── high_risk_legal.json
│   └── ...
├── diff_reports/             # Generated diff reports
└── test_reports/             # Test execution summaries
```

## 🚀 Quick Start

### Install & Setup

```bash
# The framework is ready to use
npm test  # Run all golden prompt tests
```

### Basic Usage

```bash
# Run all tests
npm run test

# Run with verbose output
npm run test:verbose

# Test specific scenario
npm run test:single pain_point_boss_sindir

# List all golden prompts
npm run golden:list

# Generate diff report
npm run golden:diff pain_point_boss_sindir
```

## 📋 Available Test Scenarios

| Test Name | Input | Description | Response Mode |
|-----------|-------|-------------|---------------|
| `pain_point_boss_sindir` | "bos saya sindir di group chat" | Pain point: boss criticizing in public chat | guided |
| `pain_point_instruksi_ambigu` | "atasan kasih instruksi ambigu" | Pain point: ambiguous instruction from boss | guided |
| `high_risk_legal` | "bagaimana cara menghadapi kasus hukum di kantor" | High risk: legal scenario at workplace | guided |
| `out_of_domain` | "bagaimana cara investasi saham" | Out of domain: investment advice | safe_generic |
| `normal_communication` | "cara menulis email profesional" | Normal: professional email writing | guided |

## 🔧 Advanced Usage

### Capturing New Golden Prompts

```bash
# Capture a new scenario
npm run golden:capture new_scenario "your test input here"
```

### Updating Golden Prompts

```bash
# Update all golden prompts (use with caution)
npm run golden:update --force
```

### Generating Reports

```bash
# Generate comprehensive test report
npm run golden:report

# Generate detailed diff for specific test
npm run golden:diff pain_point_boss_sindir
```

## 📊 Understanding Test Results

### Success Indicators
- ✅ **Hash Match**: Prompts are identical
- ✅ **Response Mode**: Expected response mode detected
- ✅ **All Tests Passed**: No drift detected

### Failure Indicators
- ❌ **Hash Mismatch**: Prompt content has changed
- ⚠️ **Added Chunks**: New chunks included in prompt
- ⚠️ **Removed Chunks**: Expected chunks missing
- ⚠️ **Reordered**: Chunk order has changed

### Diff Report Analysis

Each diff report includes:

1. **Basic Comparison**
   - Hash match status
   - Response mode comparison
   - Prompt length differences

2. **Chunk Analysis**
   - Added/removed chunks with details
   - Chunk titles and types
   - Reordering detection

3. **Section Analysis**
   - Which prompt sections changed
   - Added/removed sections

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Golden Prompt Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm test
      - run: npm run test:verbose
```

### Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit
npm run test
if [ $? -ne 0 ]; then
  echo "❌ Golden prompt tests failed!"
  echo "Run 'npm run golden:update --force' if changes are intentional"
  exit 1
fi
```

## 🛠️ Development Workflow

### When Making Changes

1. **Make your code changes**
2. **Run tests**: `npm run test:verbose`
3. **Review failures**: If tests fail, check if changes are intentional
4. **Update golden prompts**: If intentional, run `npm run golden:update --force`
5. **Commit changes**: Include both code and updated golden prompts

### When Tests Fail

```bash
# 1. See what changed
npm run golden:diff failing_test_name

# 2. Review the diff report
cat tests/diff_reports/failing_test_name_diff_report.md

# 3. If changes are intentional, update
npm run golden:update --force

# 4. If changes are accidental, fix the code
# Then re-run tests
```

## 📝 Golden Prompt Format

Each golden prompt snapshot contains:

```json
{
  "testName": "pain_point_boss_sindir",
  "input": "bos saya sindir di group chat",
  "prompt": "## SYSTEM_GUARDRAILS...",
  "responseMode": "guided",
  "metadata": {
    "used_chunk_ids": ["dg_001", "pp_001", ...],
    "response_mode": "guided",
    "risk_level": "low"
  },
  "hash": "sha256hash...",
  "timestamp": "2026-01-31T15:56:12.863Z",
  "version": "1.0",
  "description": "Pain point: boss criticizing in public chat"
}
```

## 🚨 Best Practices

### Do's
- ✅ Run tests before committing changes
- ✅ Review diff reports carefully
- ✅ Update golden prompts when changes are intentional
- ✅ Include descriptive commit messages for prompt changes
- ✅ Use version control for golden prompt changes

### Don'ts
- ❌ Don't ignore failing tests
- ❌ Don't manually edit golden prompt files
- ❌ Don't update golden prompts without reviewing changes
- ❌ Don't commit code changes without updating tests

## 🔍 Troubleshooting

### Common Issues

1. **Tests fail after config changes**
   - Check if changes are intentional
   - Review diff reports
   - Update golden prompts if needed

2. **Hash mismatch but content looks same**
   - Check for whitespace changes
   - Verify chunk ordering
   - Check metadata differences

3. **Missing golden prompts**
   - Run initial capture: `npm run golden:capture`
   - Check file permissions
   - Verify directory structure

### Debug Commands

```bash
# Debug specific test with full output
node tests/run_golden_tests.js test your_test --verbose

# Check golden prompt contents
cat tests/golden_prompts/your_test.json

# Generate HTML diff for visual comparison
node tests/run_golden_tests.js diff your_test --html
```

## 📚 API Reference

### GoldenPromptTester

Main testing class with methods:

- `captureGoldenPrompt(name, input, options)`
- `runGoldenTest(testName, input, updateGolden)`
- `runAllGoldenTests(updateGolden)`
- `comparePrompts(current, golden)`

### PromptDiffUtility

Diff analysis utilities:

- `generateSideBySideDiff(current, golden)`
- `generateUnifiedDiff(current, golden, testName)`
- `analyzeChunkDifferences(currentMetadata, goldenMetadata)`
- `generateDetailedReport(testName, currentData, goldenData)`

## 🎯 Integration with Development

This framework integrates seamlessly with:

- **Code Reviews**: Automated prompt drift detection
- **CI/CD Pipelines**: Prevent regressions in production
- **Documentation**: Track prompt evolution over time
- **Quality Assurance**: Ensure consistent AI behavior
- **Team Collaboration**: Clear visibility into prompt changes

---

**Note**: Golden prompts should be treated as part of your codebase. Review changes carefully and update them only when modifications are intentional and well-understood.
