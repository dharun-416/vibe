export interface TabContextItem {
  key: string;
  title?: string;
  favicon?: string;
  isLoading?: boolean;
  isCompleted?: boolean;
  isFallback?: boolean;
  loadingTabs?: any[];
}
