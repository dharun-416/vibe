import { useContext } from "react";
import { TabContext, TabContextType } from "../contexts/TabContextCore";

export const useTabContext = (): TabContextType => {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error("useTabContext must be used within a TabProvider");
  }
  return context;
};
