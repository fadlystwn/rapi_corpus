import { Document, LoadResult } from '../types';

export interface StrapiConfig {
  apiUrl: string;
  apiKey: string;
  contentType: string;
}

export class StrapiLoader {
  private config: StrapiConfig;

  constructor(config: StrapiConfig) {
    this.config = config;
  }

  async load(): Promise<LoadResult[]> {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/${this.config.contentType}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Strapi API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const documents = data.data.map((item: any) => this.parseStrapiDocument(item));

      return documents.map((document: Document) => ({
        success: true,
        document,
        metadata: {
          filePath: `strapi://${this.config.contentType}/${document.id}`,
          loadedAt: new Date().toISOString()
        }
      }));

    } catch (error) {
      return [{
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          filePath: `strapi://${this.config.contentType}`,
          loadedAt: new Date().toISOString()
        }
      }];
    }
  }

  private parseStrapiDocument(item: any): Document {
    const attributes = item.attributes || {};
    
    return {
      id: item.id.toString(),
      title: attributes.title || 'Untitled',
      content: attributes.content || attributes.body || '',
      type: attributes.type || 'general',
      domain: attributes.domain || 'general',
      sections: this.extractSectionsFromContent(attributes.content || attributes.body || ''),
      metadata: {
        filePath: `strapi://${this.config.contentType}/${item.id}`,
        wordCount: this.countWords(attributes.content || attributes.body || ''),
        sectionCount: 0,
        processedAt: new Date().toISOString(),
        ...attributes
      }
    };
  }

  private extractSectionsFromContent(content: string): Array<{title: string, content: string, level: number}> {
    // Similar to markdown loader but for rich text content
    const sections: Array<{title: string, content: string, level: number}> = [];
    
    // Simple section extraction - can be enhanced based on Strapi content structure
    const paragraphs = content.split('\n\n');
    
    paragraphs.forEach((paragraph, index) => {
      if (paragraph.trim()) {
        sections.push({
          title: `Section ${index + 1}`,
          content: paragraph.trim(),
          level: 1
        });
      }
    });
    
    return sections;
  }

  private countWords(content: string): number {
    return content.split(/\s+/).filter(word => word.length > 0).length;
  }
}
