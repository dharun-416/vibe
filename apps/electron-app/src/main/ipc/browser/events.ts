import { browser } from "@/index";
import { createLogger } from "@vibe/shared-types";

const logger = createLogger("BrowserEvents");

/**
 * Browser event forwarding to renderer processes
 * Window-specific approach using ApplicationWindows
 */

export function setupBrowserEventForwarding(): void {
  if (!browser) {
    logger.warn("Browser not available during event forwarding setup");
    return;
  }

  // Broadcast to all ApplicationWindows
  const broadcastToAllWindows = (eventName: string, data: any) => {
    const windows = browser?.getAllWindows() || [];
    windows.forEach(window => {
      if (!window.isDestroyed() && window.isVisible()) {
        window.webContents.send(eventName, data);
      }
    });
  };

  // Window lifecycle events for multi-window awareness
  browser.on("window-created", windowData => {
    broadcastToAllWindows("window-created", windowData);
  });

  browser.on("window-focused", windowData => {
    broadcastToAllWindows("window-focused", windowData);
  });

  browser.on("window-blurred", windowData => {
    broadcastToAllWindows("window-blurred", windowData);
  });

  browser.on("window-closing", windowData => {
    broadcastToAllWindows("window-closing", windowData);
  });

  browser.on("window-closed", windowData => {
    broadcastToAllWindows("window-closed", windowData);
  });

  logger.info(
    "Browser event forwarding setup complete (ApplicationWindow-aware)",
  );
}
