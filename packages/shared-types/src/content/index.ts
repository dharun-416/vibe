/**
 * Content and website-related shared types
 */

export interface WebsiteContext {
  id: string;
  url: string;
  title: string;
  domain: string;
  extractedContent: string;
  summary: string;
  addedAt: string;
  metadata?: {
    originalLength: number;
    contentType: string;
    source: string;
  };
}

export interface ProcessedWebsiteContext {
  title: string;
  url: string;
  domain: string;
  summary: string;
  relevanceScore: number;
  addedAt: string;
}

export interface ContentChunk {
  id: string;
  url: string;
  title?: string;
  content: string;
  text?: string; // Alternative content field
  source_id?: string;
  similarity?: number;
  metadata: {
    title: string;
    sourceId: string;
    similarity?: number;
  };
}
