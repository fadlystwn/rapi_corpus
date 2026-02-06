export interface Document {
  id: string;
  title: string;
  content: string;
  type: string;
  domain: string;
  sections: Array<{
    title: string;
    content: string;
    level: number;
  }>;
  metadata: {
    filePath: string;
    wordCount: number;
    sectionCount: number;
    processedAt: string;
    [key: string]: any;
  };
}

export interface LoadResult {
  success: boolean;
  document?: Document;
  error?: string;
  metadata: {
    filePath: string;
    loadedAt: string;
    size?: number;
  };
}

export interface Chunk {
  chunk_id: string;
  document_id: string;
  document_type: string;
  domain: string;
  title: string;
  content: string;
  section_title?: string;
  section_level?: number;
  word_count: number;
  chunk_index: number;
  total_chunks: number;
  metadata: {
    document_title: string;
    document_path: string;
    chunk_type: string;
    created_at: string;
  };
  tags?: string[];
}

export interface Embedding {
  chunk_id: string;
  vector: number[];
  model: string;
  dimensions: number;
  created_at: string;
}

export interface ChunkingStrategy {
  name: string;
  chunk(document: Document): Chunk[];
}

export interface TextCleaner {
  name: string;
  clean(text: string): string;
}

export interface IngestionConfig {
  chunking: {
    strategy: 'fixed' | 'semantic';
    maxChunkSize: number;
    overlap: number;
  };
  cleaning: {
    normalizeWhitespace: boolean;
    removeSpecialChars: boolean;
    lowercase: boolean;
  };
  embedding: {
    model: string;
    dimensions: number;
    batchSize: number;
  };
}
