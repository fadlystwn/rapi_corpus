import { Document, Chunk, ChunkingStrategy } from '../types';

export class SemanticChunker implements ChunkingStrategy {
  name = 'semantic';
  private maxChunkSize: number;
  private minChunkSize: number;

  constructor(maxChunkSize: number = 800, minChunkSize: number = 200) {
    this.maxChunkSize = maxChunkSize;
    this.minChunkSize = minChunkSize;
  }

  chunk(document: Document): Chunk[] {
    const chunks: Chunk[] = [];
    
    // Use document sections as natural semantic boundaries
    if (document.sections.length > 0) {
      return this.chunkBySections(document);
    } else {
      return this.chunkByParagraphs(document);
    }
  }

  private chunkBySections(document: Document): Chunk[] {
    const chunks: Chunk[] = [];
    let currentContent = '';
    let currentSections: Array<{title: string, level: number}> = [];
    let chunkIndex = 0;

    for (const section of document.sections) {
      const sectionContent = section.content.trim();
      const wordsInSection = sectionContent.split(/\s+/).length;

      // If adding this section would exceed max size and we have content, create a chunk
      if (currentContent && 
          this.countWords(currentContent + '\n\n' + sectionContent) > this.maxChunkSize) {
        
        chunks.push(this.createChunk(document, currentContent, currentSections, chunkIndex));
        chunkIndex++;
        currentContent = '';
        currentSections = [];
      }

      // Add section to current chunk
      currentContent += (currentContent ? '\n\n' : '') + sectionContent;
      currentSections.push({
        title: section.title,
        level: section.level
      });
    }

    // Create final chunk if there's remaining content
    if (currentContent) {
      chunks.push(this.createChunk(document, currentContent, currentSections, chunkIndex));
    }

    return chunks;
  }

  private chunkByParagraphs(document: Document): Chunk[] {
    const chunks: Chunk[] = [];
    const paragraphs = document.content.split(/\n\n+/).filter(p => p.trim());
    let currentContent = '';
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      const wordsInParagraph = paragraph.split(/\s+/).length;
      
      // If single paragraph is too large, split it
      if (wordsInParagraph > this.maxChunkSize) {
        if (currentContent) {
          chunks.push(this.createChunk(document, currentContent, [], chunkIndex));
          chunkIndex++;
          currentContent = '';
        }
        
        // Split large paragraph
        const words = paragraph.split(/\s+/);
        for (let i = 0; i < words.length; i += this.maxChunkSize) {
          const chunkWords = words.slice(i, i + this.maxChunkSize);
          const content = chunkWords.join(' ');
          chunks.push(this.createChunk(document, content, [], chunkIndex));
          chunkIndex++;
        }
      } else {
        // Check if adding this paragraph would exceed max size
        if (currentContent && 
            this.countWords(currentContent + '\n\n' + paragraph) > this.maxChunkSize) {
          
          chunks.push(this.createChunk(document, currentContent, [], chunkIndex));
          chunkIndex++;
          currentContent = '';
        }
        
        currentContent += (currentContent ? '\n\n' : '') + paragraph;
      }
    }

    // Create final chunk if there's remaining content
    if (currentContent) {
      chunks.push(this.createChunk(document, currentContent, [], chunkIndex));
    }

    return chunks;
  }

  private createChunk(
    document: Document, 
    content: string, 
    sections: Array<{title: string, level: number}>,
    chunkIndex: number
  ): Chunk {
    const primarySection = sections[0];
    
    return {
      chunk_id: this.generateChunkId(document.id, chunkIndex),
      document_id: document.id,
      document_type: document.type,
      domain: document.domain,
      title: document.title,
      content: content.trim(),
      section_title: primarySection?.title,
      section_level: primarySection?.level,
      word_count: this.countWords(content),
      chunk_index: chunkIndex,
      total_chunks: 0, // Will be updated after all chunks are created
      metadata: {
        document_title: document.title,
        document_path: document.metadata.filePath,
        chunk_type: 'semantic',
        created_at: new Date().toISOString()
      },
      tags: this.generateTags(document, sections)
    };
  }

  private generateChunkId(documentId: string, chunkIndex: number): string {
    return `${documentId}_sem_${chunkIndex.toString().padStart(3, '0')}`;
  }

  private generateTags(document: Document, sections: Array<{title: string, level: number}>): string[] {
    const tags = [document.type, document.domain];
    
    // Add section tags
    sections.forEach(section => {
      const cleanTitle = section.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
      tags.push(cleanTitle);
      
      // Add hierarchical tags based on section level
      if (section.level <= 2) {
        tags.push('main_section');
      } else if (section.level <= 4) {
        tags.push('subsection');
      } else {
        tags.push('detail_section');
      }
    });
    
    return tags;
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }
}
