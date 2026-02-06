const { IngestionPipeline, defaultIngestionConfig } = require('./ingest.ts');
const path = require('path');

async function runIngestion() {
  try {
    console.log('Starting RAPI corpus ingestion...');
    
    // Initialize pipeline
    const pipeline = new IngestionPipeline(defaultIngestionConfig);
    
    // Ingest from corpus directory
    const corpusDir = path.join(__dirname, '..', 'corpus');
    const results = await pipeline.ingestFromDirectory(corpusDir);
    
    // Save results to processed directory
    const outputDir = path.join(__dirname, '..', 'processed');
    await pipeline.saveResults(outputDir, results);
    
    console.log('Ingestion completed successfully!');
    console.log(`Documents: ${results.documents.length}`);
    console.log(`Chunks: ${results.chunks.length}`);
    console.log(`Embeddings: ${results.embeddings.length}`);
    
  } catch (error) {
    console.error('Ingestion failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runIngestion();
}

module.exports = { runIngestion };
