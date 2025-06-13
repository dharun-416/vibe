// Import and re-export from shared types
import { PageContent } from "@vibe/shared-types";
export { PageContent };

export interface PageMetadata {
  openGraph?: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
    siteName?: string;
  };
  twitter?: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
    creator?: string;
  };
  jsonLd?: any[];
  microdata?: any[];
}

export interface ExtractedPage extends PageContent {
  metadata: PageMetadata;
  images: Array<{
    src: string;
    alt?: string;
    title?: string;
  }>;
  links: Array<{
    href: string;
    text: string;
    rel?: string;
  }>;
  actions: Array<{
    type: "button" | "link" | "form";
    selector: string;
    text: string;
    attributes: Record<string, string>;
  }>;
  extractionTime: number;
  contentLength: number;
}

// Re-export from shared types
export { CDPTarget, TabInfo } from "@vibe/shared-types";
