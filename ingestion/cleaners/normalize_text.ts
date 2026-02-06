import { TextCleaner } from '../types';

export class NormalizeTextCleaner implements TextCleaner {
  name = 'normalize_text';
  private options: {
    normalizeWhitespace: boolean;
    removeSpecialChars: boolean;
    lowercase: boolean;
    removeUrls: boolean;
    removeEmails: boolean;
  };

  constructor(options: Partial<typeof NormalizeTextCleaner.prototype.options> = {}) {
    this.options = {
      normalizeWhitespace: true,
      removeSpecialChars: false,
      lowercase: false,
      removeUrls: true,
      removeEmails: true,
      ...options
    };
  }

  clean(text: string): string {
    let cleaned = text;

    // Remove URLs
    if (this.options.removeUrls) {
      cleaned = this.removeUrls(cleaned);
    }

    // Remove emails
    if (this.options.removeEmails) {
      cleaned = this.removeEmails(cleaned);
    }

    // Normalize whitespace
    if (this.options.normalizeWhitespace) {
      cleaned = this.normalizeWhitespace(cleaned);
    }

    // Remove special characters (but keep basic punctuation)
    if (this.options.removeSpecialChars) {
      cleaned = this.removeSpecialChars(cleaned);
    }

    // Convert to lowercase
    if (this.options.lowercase) {
      cleaned = cleaned.toLowerCase();
    }

    return cleaned.trim();
  }

  private removeUrls(text: string): string {
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    return text.replace(urlRegex, '[URL_REMOVED]');
  }

  private removeEmails(text: string): string {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    return text.replace(emailRegex, '[EMAIL_REMOVED]');
  }

  private normalizeWhitespace(text: string): string {
    // Replace multiple whitespace with single space
    let normalized = text.replace(/\s+/g, ' ');
    
    // Remove excessive newlines, keep max 2 consecutive newlines
    normalized = normalized.replace(/\n{3,}/g, '\n\n');
    
    // Remove leading/trailing whitespace from each line
    normalized = normalized.split('\n')
      .map(line => line.trim())
      .join('\n');
    
    return normalized;
  }

  private removeSpecialChars(text: string): string {
    // Keep letters, numbers, basic punctuation, and whitespace
    return text.replace(/[^a-zA-Z0-9\s.,!?;:()[\]{}"'\-]/g, '');
  }
}

export class MarkdownCleaner implements TextCleaner {
  name = 'markdown';
  
  clean(text: string): string {
    let cleaned = text;

    // Remove markdown formatting but preserve structure
    cleaned = this.removeMarkdownFormatting(cleaned);
    cleaned = this.normalizeCodeBlocks(cleaned);
    cleaned = this.normalizeLinks(cleaned);
    cleaned = this.normalizeLists(cleaned);

    return cleaned.trim();
  }

  private removeMarkdownFormatting(text: string): string {
    // Remove bold/italic formatting
    text = text.replace(/\*\*(.*?)\*\*/g, '$1'); // Bold
    text = text.replace(/\*(.*?)\*/g, '$1'); // Italic
    text = text.replace(/__(.*?)__/g, '$1'); // Bold alternative
    text = text.replace(/_(.*?)_/g, '$1'); // Italic alternative
    
    // Remove inline code
    text = text.replace(/`(.*?)`/g, '$1');
    
    // Remove strikethrough
    text = text.replace(/~~(.*?)~~/g, '$1');
    
    return text;
  }

  private normalizeCodeBlocks(text: string): string {
    // Replace code blocks with [CODE_BLOCK] placeholder
    return text.replace(/```[\s\S]*?```/g, '[CODE_BLOCK]');
  }

  private normalizeLinks(text: string): string {
    // Replace markdown links with just the text
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    
    // Replace reference links
    text = text.replace(/\[([^\]]+)\]\s*\[\d*\]/g, '$1');
    
    return text;
  }

  private normalizeLists(text: string): string {
    // Convert list markers to consistent format
    text = text.replace(/^\s*[-*+]\s+/gm, '• ');
    text = text.replace(/^\s*\d+\.\s+/gm, '• ');
    
    return text;
  }
}
