const assert = require('assert');
const path = require('path');
const { RetrievalExecutor } = require('../retrieval_executor.js');

console.log('--- Debug Policy Compliance Test ---');

const executor = new RetrievalExecutor();

// Debug: Check if required files are loaded
console.log('=== INITIALIZATION DEBUG ===');
console.log('Retrieval rules loaded:', !!executor.retrievalRules);
console.log('Prompt contract loaded:', !!executor.promptContract);
console.log('Corpus index loaded:', !!executor.corpusIndex);
console.log('Chunks loaded:', Object.keys(executor.chunks).length);
console.log('Embeddings loaded:', Object.keys(executor.embeddings).length);

// Debug: Check chunk types
console.log('\n=== CHUNK TYPES DEBUG ===');
const chunkTypes = {};
Object.values(executor.chunks).forEach(chunk => {
  const type = chunk.document_type || 'undefined';
  chunkTypes[type] = (chunkTypes[type] || 0) + 1;
});
console.log('Available chunk types:', chunkTypes);

// Debug: Check required sections
console.log('\n=== REQUIRED SECTIONS DEBUG ===');
executor.promptContract.sections.forEach(section => {
  if (section.required) {
    console.log(`Required section: ${section.name}, needs chunk types: ${section.chunk_types.join(', ')}`);
    section.chunk_types.forEach(chunkType => {
      const chunks = executor.getChunksByType(chunkType);
      console.log(`  - ${chunkType}: ${chunks.length} chunks available`);
    });
  }
});

// Test one scenario with detailed debugging
console.log('\n=== SCENARIO TEST DEBUG ===');
const testQuery = 'Gimana cara ngomong ke bos kalau gue mau minta naik gaji karena tanggung jawab nambah?';
console.log('Test query:', testQuery);

const processedInput = executor.preprocessInput(testQuery);
console.log('Processed input:', processedInput);

const retrievalResult = executor.performRetrieval(processedInput);
console.log('Retrieved chunks:', retrievalResult.retrieved_chunks.length);
console.log('Used chunk IDs:', retrievalResult.used_chunk_ids);

// Check if required sections can be built
console.log('\n=== SECTION BUILDING DEBUG ===');
for (const sectionConfig of executor.promptContract.sections) {
  const sectionChunks = retrievalResult.retrieved_chunks.filter(chunk => 
    executor.chunkMatchesSection(chunk, sectionConfig)
  );
  console.log(`Section ${sectionConfig.name}: ${sectionChunks.length} chunks, required: ${sectionConfig.required}`);
  
  if (sectionConfig.required && sectionChunks.length === 0) {
    console.log(`  ❌ MISSING REQUIRED SECTION: ${sectionConfig.name}`);
  }
}

const finalResult = executor.executeRetrieval(testQuery);
console.log('\n=== FINAL RESULT ===');
console.log('Response mode:', finalResult.response_mode);
console.log('Prompt preview (first 200 chars):', finalResult.prompt.substring(0, 200) + '...');
