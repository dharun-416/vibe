import { useMemo } from "react";
import { TabContextItem } from "@/types/tabContext";

interface ProcessedTabContext {
  globalStatus: "loading" | "connected" | "disconnected";
  globalStatusTitle: string;
  shouldShowStatus: boolean;
  sharedLoadingEntry?: TabContextItem;
  completedTabs: TabContextItem[];
  regularTabs: TabContextItem[];
  hasMoreTabs: boolean;
  moreTabsCount: number;
}

export const useTabContext = (
  tabContext: TabContextItem[],
): ProcessedTabContext => {
  return useMemo(() => {
    const tabs = tabContext.slice(0, 5);
    const sharedLoadingEntry = tabs.find(
      tab => tab.key === "shared-loading-tabs" && tab.isLoading,
    );
    const completedTabs = tabs.filter(
      tab =>
        tab.key !== "shared-loading-tabs" &&
        !tab.isLoading &&
        (tab as any).isCompleted !== undefined,
    );
    const regularTabs = tabs.filter(
      tab =>
        tab.key !== "shared-loading-tabs" &&
        !tab.isLoading &&
        (tab as any).isCompleted === undefined,
    );

    let globalStatus: "loading" | "connected" | "disconnected" = "disconnected";
    let globalStatusTitle = "No tabs processed yet";
    let shouldShowStatus = false;

    if (sharedLoadingEntry) {
      shouldShowStatus = true;
      globalStatus = "loading";
      const loadingTabs = (sharedLoadingEntry as any).loadingTabs || [];
      globalStatusTitle = `Processing ${loadingTabs.length} tab${loadingTabs.length > 1 ? "s" : ""}...`;
    } else if (completedTabs.length > 0) {
      shouldShowStatus = true;
      const mostRecentTab = completedTabs[completedTabs.length - 1];
      globalStatus = (mostRecentTab as any).isCompleted
        ? "connected"
        : "disconnected";
      globalStatusTitle = (mostRecentTab as any).isFallback
        ? "Most recent tab processed with warnings"
        : "Most recent tab successfully processed";
    }

    return {
      globalStatus,
      globalStatusTitle,
      shouldShowStatus,
      sharedLoadingEntry,
      completedTabs,
      regularTabs,
      hasMoreTabs: tabContext.length > 5,
      moreTabsCount: Math.max(0, tabContext.length - 5),
    };
  }, [tabContext]);
};
