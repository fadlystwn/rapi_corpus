import fs from 'fs';
import path from 'path';
import { Document, Chunk, Embedding, IngestionConfig, LoadResult, ChunkingStrategy, TextCleaner } from './types';
import { MarkdownLoader } from './loaders/markdown_loader';
import { StrapiLoader, StrapiConfig } from './loaders/strapi_loader';
import { FixedChunker } from './chunkers/fixed_chunker';
import { SemanticChunker } from './chunkers/semantic_chunker';
import { NormalizeTextCleaner, MarkdownCleaner } from './cleaners/normalize_text';

export class IngestionPipeline {
  private config: IngestionConfig;
  private markdownLoader: MarkdownLoader;
  private strapiLoader?: StrapiLoader;
  private chunkers: Map<string, ChunkingStrategy>;
  private cleaners: Map<string, TextCleaner>;

  constructor(config: IngestionConfig, strapiConfig?: StrapiConfig) {
    this.config = config;
    this.markdownLoader = new MarkdownLoader();
    
    if (strapiConfig) {
      this.strapiLoader = new StrapiLoader(strapiConfig);
    }

    this.chunkers = new Map<string, ChunkingStrategy>();
    this.chunkers.set('fixed', new FixedChunker(config.chunking.maxChunkSize, config.chunking.overlap));
    this.chunkers.set('semantic', new SemanticChunker(config.chunking.maxChunkSize));

    this.cleaners = new Map<string, TextCleaner>();
    this.cleaners.set('normalize_text', new NormalizeTextCleaner(this.config.cleaning));
    this.cleaners.set('markdown', new MarkdownCleaner());
  }

  async ingestFromDirectory(dirPath: string): Promise<{
    documents: Document[];
    chunks: Chunk[];
    embeddings: Embedding[];
  }> {
    console.log(`Starting ingestion from directory: ${dirPath}`);
    
    // Load documents
    const loadResults = await this.markdownLoader.loadDirectory(dirPath);
    const documents = loadResults
      .filter(result => result.success)
      .map(result => result.document!);

    console.log(`Loaded ${documents.length} documents`);

    // Process documents
    const chunks = await this.processDocuments(documents);
    console.log(`Generated ${chunks.length} chunks`);

    // Generate embeddings
    const embeddings = await this.generateEmbeddings(chunks);
    console.log(`Generated ${embeddings.length} embeddings`);

    return { documents, chunks, embeddings };
  }

  async ingestFromStrapi(): Promise<{
    documents: Document[];
    chunks: Chunk[];
    embeddings: Embedding[];
  }> {
    if (!this.strapiLoader) {
      throw new Error('Strapi loader not configured');
    }

    console.log('Starting ingestion from Strapi');
    
    // Load documents
    const loadResults = await this.strapiLoader.load();
    const documents = loadResults
      .filter(result => result.success)
      .map(result => result.document!);

    console.log(`Loaded ${documents.length} documents from Strapi`);

    // Process documents
    const chunks = await this.processDocuments(documents);
    console.log(`Generated ${chunks.length} chunks`);

    // Generate embeddings
    const embeddings = await this.generateEmbeddings(chunks);
    console.log(`Generated ${embeddings.length} embeddings`);

    return { documents, chunks, embeddings };
  }

  private async processDocuments(documents: Document[]): Promise<Chunk[]> {
    const allChunks: Chunk[] = [];

    for (const document of documents) {
      // Clean document content
      const cleanedContent = await this.cleanDocument(document);
      const cleanedDocument = { ...document, content: cleanedContent };

      // Chunk document
      const chunker = this.chunkers.get(this.config.chunking.strategy);
      if (!chunker) {
        throw new Error(`Unknown chunking strategy: ${this.config.chunking.strategy}`);
      }

      const chunks = chunker.chunk(cleanedDocument);
      allChunks.push(...chunks);
    }

    // Update total_chunks for all chunks
    const chunksByDocument = new Map<string, Chunk[]>();
    allChunks.forEach(chunk => {
      if (!chunksByDocument.has(chunk.document_id)) {
        chunksByDocument.set(chunk.document_id, []);
      }
      chunksByDocument.get(chunk.document_id)!.push(chunk);
    });

    chunksByDocument.forEach(chunks => {
      const totalChunks = chunks.length;
      chunks.forEach(chunk => {
        chunk.total_chunks = totalChunks;
      });
    });

    return allChunks;
  }

  private async cleanDocument(document: Document): Promise<string> {
    let cleanedContent = document.content;

    // Apply cleaners in sequence
    if (this.config.cleaning.normalizeWhitespace) {
      const cleaner = this.cleaners.get('normalize_text');
      if (cleaner) {
        cleanedContent = cleaner.clean(cleanedContent);
      }
    }

    // Always apply markdown cleaner for markdown documents
    if (document.metadata.filePath.endsWith('.md')) {
      const markdownCleaner = this.cleaners.get('markdown');
      if (markdownCleaner) {
        cleanedContent = markdownCleaner.clean(cleanedContent);
      }
    }

    return cleanedContent;
  }

  private async generateEmbeddings(chunks: Chunk[]): Promise<Embedding[]> {
    const embeddings: Embedding[] = [];
    
    // Process in batches
    for (let i = 0; i < chunks.length; i += this.config.embedding.batchSize) {
      const batch = chunks.slice(i, i + this.config.embedding.batchSize);
      const batchEmbeddings = await this.generateBatchEmbeddings(batch);
      embeddings.push(...batchEmbeddings);
    }

    return embeddings;
  }

  private async generateBatchEmbeddings(chunks: Chunk[]): Promise<Embedding[]> {
    // This is a placeholder implementation
    // In a real implementation, you would call an embedding API here
    // For now, we'll generate random vectors for demonstration
    
    return chunks.map(chunk => ({
      chunk_id: chunk.chunk_id,
      vector: this.generateRandomVector(this.config.embedding.dimensions),
      model: this.config.embedding.model,
      dimensions: this.config.embedding.dimensions,
      created_at: new Date().toISOString()
    }));
  }

  private generateRandomVector(dimensions: number): number[] {
    return Array.from({ length: dimensions }, () => Math.random() - 0.5);
  }

  async saveResults(outputDir: string, results: {
    documents: Document[];
    chunks: Chunk[];
    embeddings: Embedding[];
  }): Promise<void> {
    // Ensure output directory exists
    fs.mkdirSync(outputDir, { recursive: true });

    // Save chunks grouped by document type
    const chunksByType = new Map<string, Chunk[]>();
    results.chunks.forEach(chunk => {
      if (!chunksByType.has(chunk.document_type)) {
        chunksByType.set(chunk.document_type, []);
      }
      chunksByType.get(chunk.document_type)!.push(chunk);
    });

    // Save chunks
    for (const [type, chunks] of chunksByType) {
      const chunksData = {
        type,
        total_chunks: chunks.length,
        chunks: chunks.map(chunk => ({
          chunk_id: chunk.chunk_id,
          document_id: chunk.document_id,
          document_type: chunk.document_type, // Ensure document_type is saved in the chunk
          title: chunk.title,
          content: chunk.content,
          section_title: chunk.section_title,
          section_level: chunk.section_level,
          word_count: chunk.word_count,
          chunk_index: chunk.chunk_index,
          total_chunks: chunk.total_chunks,
          metadata: chunk.metadata,
          tags: chunk.tags
        }))
      };

      fs.writeFileSync(
        path.join(outputDir, `${type}.json`),
        JSON.stringify(chunksData, null, 2)
      );
    }

    // Save embeddings grouped by document type
    const embeddingsByType = new Map<string, Embedding[]>();
    results.embeddings.forEach(embedding => {
      const chunk = results.chunks.find(c => c.chunk_id === embedding.chunk_id);
      if (chunk) {
        if (!embeddingsByType.has(chunk.document_type)) {
          embeddingsByType.set(chunk.document_type, []);
        }
        embeddingsByType.get(chunk.document_type)!.push(embedding);
      }
    });

    // Save embeddings
    for (const [type, embeddings] of embeddingsByType) {
      const embeddingsData = {
        type,
        total_embeddings: embeddings.length,
        embeddings: embeddings.map(embedding => ({
          chunk_id: embedding.chunk_id,
          vector: embedding.vector,
          model: embedding.model,
          dimensions: embedding.dimensions,
          created_at: embedding.created_at
        }))
      };

      fs.writeFileSync(
        path.join(outputDir, `${type}.vec.json`),
        JSON.stringify(embeddingsData, null, 2)
      );
    }

    // Save metadata
    const metadata = {
      ingestion_config: this.config,
      processed_at: new Date().toISOString(),
      documents: {
        total: results.documents.length,
        by_domain: this.countDocumentsByDomain(results.documents),
        by_type: this.countDocumentsByType(results.documents)
      },
      chunks: {
        total: results.chunks.length,
        by_type: this.countChunksByType(results.chunks),
        by_domain: this.countChunksByDomain(results.chunks)
      },
      embeddings: {
        total: results.embeddings.length,
        model: this.config.embedding.model,
        dimensions: this.config.embedding.dimensions
      }
    };

    fs.writeFileSync(
      path.join(outputDir, 'ingestion_metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    console.log(`Results saved to ${outputDir}`);
  }

  private countDocumentsByDomain(documents: Document[]): Record<string, number> {
    const counts: Record<string, number> = {};
    documents.forEach(doc => {
      counts[doc.domain] = (counts[doc.domain] || 0) + 1;
    });
    return counts;
  }

  private countDocumentsByType(documents: Document[]): Record<string, number> {
    const counts: Record<string, number> = {};
    documents.forEach(doc => {
      counts[doc.type] = (counts[doc.type] || 0) + 1;
    });
    return counts;
  }

  private countChunksByType(chunks: Chunk[]): Record<string, number> {
    const counts: Record<string, number> = {};
    chunks.forEach(chunk => {
      counts[chunk.document_type] = (counts[chunk.document_type] || 0) + 1;
    });
    return counts;
  }

  private countChunksByDomain(chunks: Chunk[]): Record<string, number> {
    const counts: Record<string, number> = {};
    chunks.forEach(chunk => {
      counts[chunk.domain] = (counts[chunk.domain] || 0) + 1;
    });
    return counts;
  }
}

// Default configuration
export const defaultIngestionConfig: IngestionConfig = {
  chunking: {
    strategy: 'semantic',
    maxChunkSize: 800,
    overlap: 100
  },
  cleaning: {
    normalizeWhitespace: true,
    removeSpecialChars: false,
    lowercase: false
  },
  embedding: {
    model: 'text-embedding-ada-002',
    dimensions: 1536,
    batchSize: 100
  }
};
