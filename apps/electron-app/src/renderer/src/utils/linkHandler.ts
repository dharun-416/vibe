import type { TabItem } from "../contexts/TabContextCore";

export interface LinkHandlerOptions {
  tabDetails: Map<string, TabItem>;
  activeKey: string | null;
  handleTabChange: (key: string) => void;
  handleTabAdd: () => void;
}

/**
 * Normalize URL for comparison
 * Handles protocol normalization, trailing slashes, and common variations
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Normalize protocol, remove trailing slash, and lowercase
    return parsed.href
      .replace(/\/$/, "")
      .replace(/^https?:/, match => match.toLowerCase());
  } catch {
    // If URL parsing fails, return as-is with basic normalization
    return url.trim().toLowerCase();
  }
}

/**
 * Create a URL to tab key lookup map for efficient searching
 */
export function createUrlToTabMap(
  tabDetails: Map<string, TabItem>,
): Map<string, string> {
  const urlMap = new Map<string, string>();

  for (const [key, tab] of tabDetails) {
    if (tab.url) {
      urlMap.set(normalizeUrl(tab.url), key);
    }
  }

  return urlMap;
}

/**
 * Handle link click with smart tab routing
 */
export function handleSmartLinkClick(
  href: string,
  options: LinkHandlerOptions,
): void {
  const { tabDetails, activeKey, handleTabChange, handleTabAdd } = options;

  // Skip special protocol links
  if (
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("javascript:")
  ) {
    return;
  }

  const normalizedHref = normalizeUrl(href);
  const urlToTabMap = createUrlToTabMap(tabDetails);

  // Check if URL matches current tab
  const activeTab = activeKey ? tabDetails.get(activeKey) : null;
  if (activeTab && normalizeUrl(activeTab.url) === normalizedHref) {
    return;
  }

  // Check if URL exists in another tab (O(1) lookup)
  const existingTabKey = urlToTabMap.get(normalizedHref);
  if (existingTabKey) {
    handleTabChange(existingTabKey);
    return;
  }

  // Use the clean API to create tab with URL directly
  window.vibe?.tabs?.createTab?.(href);

  // Update component state
  handleTabAdd();
}
