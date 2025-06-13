/**
 * Tabs menu items
 */

import type { MenuItemConstructorOptions } from "electron";
import { Browser } from "@/browser/browser";
import { BrowserWindow } from "electron";

export function createTabsMenu(browser: Browser): MenuItemConstructorOptions {
  const isMac = process.platform === "darwin";

  const switchToTab = (index: number) => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (!focusedWindow) return;

    const appWindow = browser.getApplicationWindow(
      focusedWindow.webContents.id,
    );
    if (!appWindow) return;

    const tabs = appWindow.tabManager.getTabsByPosition();
    if (tabs.length >= index) {
      const targetTab = tabs[index - 1];
      if (targetTab && targetTab.key) {
        appWindow.tabManager.setActiveTab(targetTab.key);
      }
    }
  };

  return {
    label: "Tabs",
    submenu: [
      {
        label: "Switch to Tab 1",
        accelerator: isMac ? "Command+1" : "Alt+1",
        click: () => switchToTab(1),
      },
      {
        label: "Switch to Tab 2",
        accelerator: isMac ? "Command+2" : "Alt+2",
        click: () => switchToTab(2),
      },
      {
        label: "Switch to Tab 3",
        accelerator: isMac ? "Command+3" : "Alt+3",
        click: () => switchToTab(3),
      },
      {
        label: "Switch to Tab 4",
        accelerator: isMac ? "Command+4" : "Alt+4",
        click: () => switchToTab(4),
      },
      {
        label: "Switch to Tab 5",
        accelerator: isMac ? "Command+5" : "Alt+5",
        click: () => switchToTab(5),
      },
      {
        label: "Switch to Tab 6",
        accelerator: isMac ? "Command+6" : "Alt+6",
        click: () => switchToTab(6),
      },
      {
        label: "Switch to Tab 7",
        accelerator: isMac ? "Command+7" : "Alt+7",
        click: () => switchToTab(7),
      },
      {
        label: "Switch to Tab 8",
        accelerator: isMac ? "Command+8" : "Alt+8",
        click: () => switchToTab(8),
      },
      {
        label: "Switch to Tab 9",
        accelerator: isMac ? "Command+9" : "Alt+9",
        click: () => switchToTab(9),
      },
    ] as MenuItemConstructorOptions[],
  };
}
