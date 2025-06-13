import React from "react";
import { TabContext, TabItem } from "./TabContextCore";

export const TabProvider: React.FC<{
  children: React.ReactNode;
  tabDetails: Map<string, TabItem>;
  activeKey: string | null;
  handleTabChange: (key: string) => void;
  handleTabAdd: () => void;
}> = ({ children, tabDetails, activeKey, handleTabChange, handleTabAdd }) => {
  return (
    <TabContext.Provider
      value={{ tabDetails, activeKey, handleTabChange, handleTabAdd }}
    >
      {children}
    </TabContext.Provider>
  );
};
