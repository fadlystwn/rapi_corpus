import { Document, Chunk, ChunkingStrategy } from '../types';

export class FixedChunker implements ChunkingStrategy {
  name = 'fixed';
  private maxChunkSize: number;
  private overlap: number;

  constructor(maxChunkSize: number = 500, overlap: number = 50) {
    this.maxChunkSize = maxChunkSize;
    this.overlap = overlap;
  }

  chunk(document: Document): Chunk[] {
    const chunks: Chunk[] = [];
    const words = document.content.split(/\s+/);
    const totalChunks = Math.ceil(words.length / (this.maxChunkSize - this.overlap));

    for (let i = 0; i < totalChunks; i++) {
      const startIndex = i * (this.maxChunkSize - this.overlap);
      const endIndex = Math.min(startIndex + this.maxChunkSize, words.length);
      const chunkWords = words.slice(startIndex, endIndex);
      const content = chunkWords.join(' ');

      const chunk: Chunk = {
        chunk_id: this.generateChunkId(document.id, i),
        document_id: document.id,
        document_type: document.type,
        domain: document.domain,
        title: document.title,
        content: content.trim(),
        word_count: chunkWords.length,
        chunk_index: i,
        total_chunks: totalChunks,
        metadata: {
          document_title: document.title,
          document_path: document.metadata.filePath,
          chunk_type: 'fixed',
          created_at: new Date().toISOString()
        },
        tags: this.generateTags(document, i)
      };

      chunks.push(chunk);
    }

    return chunks;
  }

  private generateChunkId(documentId: string, chunkIndex: number): string {
    return `${documentId}_chk_${chunkIndex.toString().padStart(3, '0')}`;
  }

  private generateTags(document: Document, chunkIndex: number): string[] {
    const tags = [document.type, document.domain];
    
    // Add section-specific tags if available
    if (document.sections.length > 0) {
      const sectionIndex = Math.floor(chunkIndex / Math.ceil(document.content.length / document.sections.length));
      if (sectionIndex < document.sections.length) {
        tags.push(document.sections[sectionIndex].title.toLowerCase().replace(/\s+/g, '_'));
      }
    }
    
    return tags;
  }
}
