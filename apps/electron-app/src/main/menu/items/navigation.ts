/**
 * Navigation menu items
 */

import type { MenuItemConstructorOptions } from "electron";
import { Browser } from "@/browser/browser";
import { BrowserWindow } from "electron";

export function createNavigationMenu(
  browser: Browser,
): MenuItemConstructorOptions {
  const isMac = process.platform === "darwin";

  return {
    label: "Navigation",
    submenu: [
      {
        label: "Back",
        accelerator: isMac ? "Command+Left" : "Control+Left",
        click: () => {
          const focusedWindow = BrowserWindow.getFocusedWindow();
          if (!focusedWindow) return;

          const appWindow = browser.getApplicationWindow(
            focusedWindow.webContents.id,
          );
          if (!appWindow) return;

          const activeTabKey = appWindow.tabManager.getActiveTabKey();
          if (activeTabKey) {
            const activeView = appWindow.viewManager.getView(activeTabKey);
            if (
              activeView &&
              !activeView.webContents.isDestroyed() &&
              activeView.webContents.navigationHistory.canGoBack()
            ) {
              activeView.webContents.goBack();
            }
          }
        },
      },
      {
        label: "Forward",
        accelerator: isMac ? "Command+Right" : "Control+Right",
        click: () => {
          const focusedWindow = BrowserWindow.getFocusedWindow();
          if (!focusedWindow) return;

          const appWindow = browser.getApplicationWindow(
            focusedWindow.webContents.id,
          );
          if (!appWindow) return;

          const activeTabKey = appWindow.tabManager.getActiveTabKey();
          if (activeTabKey) {
            const activeView = appWindow.viewManager.getView(activeTabKey);
            if (
              activeView &&
              !activeView.webContents.isDestroyed() &&
              activeView.webContents.navigationHistory.canGoForward()
            ) {
              activeView.webContents.goForward();
            }
          }
        },
      },
    ] as MenuItemConstructorOptions[],
  };
}
