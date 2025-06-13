import { createContext } from "react";

export interface TabItem {
  reactKey: string;
  title: string;
  isAgentActive?: boolean;
  favicon?: string;
  url: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

export interface TabContextType {
  tabDetails: Map<string, TabItem>;
  activeKey: string | null;
  handleTabChange: (key: string) => void;
  handleTabAdd: () => void;
}

export const TabContext = createContext<TabContextType | undefined>(undefined);
