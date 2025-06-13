/**
 * Favicon utility functions
 */

import { truncateUrl } from "@vibe/shared-types";
import { createLogger } from "@vibe/shared-types";

const logger = createLogger("FaviconUtils");

/**
 * Fetch a favicon and convert it to a data URL to bypass CSP restrictions
 * @param url The URL of the favicon to fetch
 * @returns A Promise that resolves to a data URL
 */
export async function fetchFaviconAsDataUrl(url: string): Promise<string> {
  if (!url || url.startsWith("data:")) {
    return url; // Return as-is if it's already a data URL or empty
  }

  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");

    // Determine MIME type based on URL extension or default to image/x-icon
    let mimeType = "image/x-icon";
    if (url.endsWith(".png")) {
      mimeType = "image/png";
    } else if (url.endsWith(".jpg") || url.endsWith(".jpeg")) {
      mimeType = "image/jpeg";
    } else if (url.endsWith(".svg")) {
      mimeType = "image/svg+xml";
    } else if (url.endsWith(".gif")) {
      mimeType = "image/gif";
    }

    return `data:${mimeType};base64,${base64Data}`;
  } catch (error) {
    logger.error(`Failed to fetch favicon from ${truncateUrl(url)}:`, error);
    // Return a default favicon data URL
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='7' fill='%23f0f0f0' stroke='%23cccccc' stroke-width='1'/%3E%3C/svg%3E";
  }
}

/**
 * Generate a default favicon with the first letter of a title
 * @param title The title to generate favicon from
 * @returns A data URL for the generated favicon
 */
export function generateDefaultFavicon(title: string): string {
  const letter = (title || "?").charAt(0).toUpperCase();
  const colors = [
    "#3b82f6",
    "#ef4444",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#06b6d4",
    "#f97316",
    "#84cc16",
    "#ec4899",
    "#6366f1",
  ];
  const color = colors[letter.charCodeAt(0) % colors.length];

  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='${encodeURIComponent(color)}'/%3E%3Ctext x='16' y='20' text-anchor='middle' fill='white' font-family='system-ui' font-size='18' font-weight='600'%3E${letter}%3C/text%3E%3C/svg%3E`;
}
