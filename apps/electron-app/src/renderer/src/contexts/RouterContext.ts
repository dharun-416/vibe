import { createContext } from "react";

export interface RouterContextProps {
  protocol: string;
  hostname: string;
  pathname: string;
  href: string;
}

export const RouterContext = createContext<RouterContextProps | null>(null);
