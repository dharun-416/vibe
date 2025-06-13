import { useState, useEffect, ReactNode } from "react";
import { RouterContext, RouterContextProps } from "@/contexts/RouterContext";

interface RouterProviderProps {
  children: ReactNode;
}

export function RouterProvider({ children }: RouterProviderProps) {
  const [routerState, setRouterState] = useState<RouterContextProps>({
    protocol: "",
    hostname: "",
    pathname: "",
    href: "",
  });

  const updateLocationState = () => {
    const location = window.location;
    setRouterState({
      protocol: location.protocol,
      hostname: location.hostname,
      pathname: location.pathname,
      href: location.href,
    });
  };

  useEffect(() => {
    updateLocationState();
    window.addEventListener("popstate", updateLocationState);

    return () => {
      window.removeEventListener("popstate", updateLocationState);
    };
  }, []);

  return (
    <RouterContext.Provider value={routerState}>
      {children}
    </RouterContext.Provider>
  );
}
