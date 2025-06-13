import { mainStore } from "@/store/store";
import type { AppState } from "@/store/types";
import type { Browser } from "@/browser/browser";
import { createLogger } from "@vibe/shared-types";

const logger = createLogger("SessionStateSync");

/**
 * State synchronization setup
 * Broadcasts session state to all windows - global session state
 */

let currentUnsubscribe: (() => void) | null = null;

export function setupSessionStateSync(browser?: Browser): () => void {
  // Clean up any existing subscription
  if (currentUnsubscribe) {
    currentUnsubscribe();
    currentUnsubscribe = null;
  }

  if (!browser) {
    logger.info("No browser provided, skipping state sync");
    return () => {};
  }

  // Subscribe to store changes and broadcast to all windows
  const unsubscribe = mainStore.subscribe(
    (state: AppState, prevState: AppState) => {
      const messagesChanged =
        JSON.stringify(state.messages) !== JSON.stringify(prevState.messages);
      const tabContextChanged =
        JSON.stringify(state.requestedTabContext) !==
        JSON.stringify(prevState.requestedTabContext);
      const sessionTabsChanged =
        JSON.stringify(state.sessionTabs) !==
        JSON.stringify(prevState.sessionTabs);
      // Note: websiteContexts tracking removed - now handled by MCP memory system

      if (messagesChanged || tabContextChanged || sessionTabsChanged) {
        // Broadcast to all windows
        const windows = browser.getAllWindows();
        windows.forEach(window => {
          if (!window.isDestroyed()) {
            window.webContents.send("session:state-changed", state);
            // Also send zustand bridge update for compatibility
            window.webContents.send("zustand-update", state);
          }
        });
      }
    },
  );

  currentUnsubscribe = unsubscribe;
  return unsubscribe;
}
