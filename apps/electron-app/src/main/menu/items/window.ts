/**
 * Window menu items
 */

import type { MenuItemConstructorOptions } from "electron";

export function createWindowMenu(): MenuItemConstructorOptions {
  const isMac = process.platform === "darwin";

  return {
    label: "Window",
    submenu: [
      { role: "minimize" },
      { role: "zoom" },
      ...(isMac
        ? [
            { type: "separator" },
            { role: "front" },
            { type: "separator" },
            { role: "window" },
          ]
        : [{ role: "close" }]),
    ] as MenuItemConstructorOptions[],
  };
}
