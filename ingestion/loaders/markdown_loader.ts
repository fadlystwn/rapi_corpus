import fs from 'fs';
import path from 'path';
import { Document, LoadResult } from '../types';

export class MarkdownLoader {
  private readonly supportedExtensions = ['.md', '.markdown'];

  async load(filePath: string): Promise<LoadResult> {
    if (!this.isSupported(filePath)) {
      throw new Error(`Unsupported file type: ${filePath}`);
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const document = this.parseMarkdownDocument(filePath, content);
      
      return {
        success: true,
        document,
        metadata: {
          filePath,
          size: content.length,
          loadedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          filePath,
          loadedAt: new Date().toISOString()
        }
      };
    }
  }

  async loadDirectory(dirPath: string): Promise<LoadResult[]> {
    const results: LoadResult[] = [];
    const files = this.getMarkdownFiles(dirPath);

    for (const file of files) {
      const result = await this.load(file);
      results.push(result);
    }

    return results;
  }

  private isSupported(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.supportedExtensions.includes(ext);
  }

  private getMarkdownFiles(dirPath: string): string[] {
    const files: string[] = [];
    
    function traverse(currentPath: string) {
      const items = fs.readdirSync(currentPath);
      
      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          traverse(fullPath);
        } else if (path.extname(item).toLowerCase() === '.md') {
          files.push(fullPath);
        }
      }
    }
    
    traverse(dirPath);
    return files;
  }

  private parseMarkdownDocument(filePath: string, content: string): Document {
    const relativePath = path.relative(process.cwd(), filePath);
    const pathParts = relativePath.split(path.sep);
    
    // Extract metadata from frontmatter if present
    const frontmatter = this.extractFrontmatter(content);
    const cleanContent = this.removeFrontmatter(content);
    
    // Determine document type and domain from path
    const domain = this.extractDomain(pathParts);
    const documentType = this.extractDocumentType(pathParts, frontmatter);
    
    // Extract sections
    const sections = this.extractSections(cleanContent);
    
    return {
      id: this.generateDocumentId(relativePath),
      title: frontmatter.title || this.extractTitle(cleanContent),
      content: cleanContent,
      type: documentType,
      domain,
      sections,
      metadata: {
        filePath: relativePath,
        ...frontmatter,
        wordCount: this.countWords(cleanContent),
        sectionCount: sections.length,
        processedAt: new Date().toISOString()
      }
    };
  }

  private extractFrontmatter(content: string): Record<string, any> {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const match = content.match(frontmatterRegex);
    
    if (!match) return {};
    
    try {
      // Simple YAML-like parsing
      const frontmatterText = match[1];
      const lines = frontmatterText.split('\n');
      const result: Record<string, any> = {};
      
      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          let value = line.substring(colonIndex + 1).trim();
          
          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          
          result[key] = value;
        }
      }
      
      return result;
    } catch {
      return {};
    }
  }

  private removeFrontmatter(content: string): string {
    const frontmatterRegex = /^---\s*\n[\s\S]*?\n---\s*\n/;
    return content.replace(frontmatterRegex, '');
  }

  private extractDomain(pathParts: string[]): string {
    // Look for domain in path (corpus/domains/{domain}/)
    const domainIndex = pathParts.findIndex(part => part === 'domains');
    if (domainIndex !== -1 && domainIndex + 1 < pathParts.length) {
      return pathParts[domainIndex + 1];
    }
    
    // Fallback: determine from path structure
    if (pathParts.includes('scenarios')) return 'scenarios';
    if (pathParts.includes('glossaries')) return 'glossaries';
    
    return 'general';
  }

  private extractDocumentType(pathParts: string[], frontmatter: Record<string, any>): string {
    // Check frontmatter first
    if (frontmatter.Type) return frontmatter.Type.toLowerCase();
    if (frontmatter.type) return frontmatter.type.toLowerCase();
    
    // Determine from filename
    const fileName = pathParts[pathParts.length - 1];
    const nameWithoutExt = fileName.replace('.md', '').toLowerCase();

    // Exact matches first for critical files
    if (nameWithoutExt === 'decisions_principles') return 'decision_principles';
    if (nameWithoutExt === 'communication_patterns') return 'communication_patterns';
    if (nameWithoutExt === 'domain_guardrails') return 'guardrails';
    if (nameWithoutExt === 'response_output_standard') return 'response_standards';
    
    // Broader includes as fallback
    if (nameWithoutExt.includes('guardrail')) return 'guardrails';
    if (nameWithoutExt.includes('standard')) return 'response_standards';
    if (nameWithoutExt.includes('risk')) return 'risk_matrix';
    if (nameWithoutExt.includes('pain')) return 'pain_points';
    if (nameWithoutExt.includes('decision')) return 'decision_principles';
    if (nameWithoutExt.includes('communication')) return 'communication_patterns';
    if (nameWithoutExt.includes('policy')) return 'policy';
    if (nameWithoutExt.includes('allowed')) return 'allowed_topics';
    if (nameWithoutExt.includes('disallowed')) return 'disallowed_topics';
    if (nameWithoutExt.includes('glossary')) return 'glossary';
    
    return 'general';
  }

  private extractSections(content: string): Array<{title: string, content: string, level: number}> {
    const sections: Array<{title: string, content: string, level: number}> = [];
    const lines = content.split('\n');
    let currentSection: {title: string, content: string, level: number} | null = null;
    
    for (const line of lines) {
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headerMatch) {
        // Save previous section
        if (currentSection) {
          sections.push({...currentSection});
        }
        
        // Start new section
        currentSection = {
          title: headerMatch[2].trim(),
          content: '',
          level: headerMatch[1].length
        };
      } else if (currentSection) {
        currentSection.content += line + '\n';
      }
    }
    
    // Save last section
    if (currentSection) {
      sections.push({...currentSection});
    }
    
    return sections;
  }

  private extractTitle(content: string): string {
    const lines = content.split('\n');
    
    for (const line of lines) {
      const headerMatch = line.match(/^#{1,2}\s+(.+)$/);
      if (headerMatch) {
        return headerMatch[1].trim();
      }
    }
    
    // Fallback to first line if no headers found
    const firstLine = lines[0]?.trim();
    return firstLine || 'Untitled Document';
  }

  private generateDocumentId(filePath: string): string {
    // Create a consistent ID from file path
    const normalized = filePath.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return normalized;
  }

  private countWords(content: string): number {
    return content.split(/\s+/).filter(word => word.length > 0).length;
  }
}
