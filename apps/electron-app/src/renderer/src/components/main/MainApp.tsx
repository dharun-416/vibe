import React, { useState, useEffect } from "react";
import NavigationBar from "../layout/NavigationBar";
import ChromeTabBar from "../layout/TabBar";
import { ChatPage } from "../../pages/chat/ChatPage";
import { ChatErrorBoundary } from "../ui/error-boundary";
import { CHAT_PANEL } from "@vibe/shared-types";

/**
 * Layout Provider - Clean state management
 */
interface LayoutContextType {
  isChatPanelVisible: boolean;
  chatPanelWidth: number;
  setChatPanelVisible: (visible: boolean) => void;
  setChatPanelWidth: (width: number) => void;
}

const LayoutContext = React.createContext<LayoutContextType | null>(null);

function useLayout(): LayoutContextType {
  const context = React.useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
}

function LayoutProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [isChatPanelVisible, setChatPanelVisible] = useState(false);
  const [chatPanelWidth, setChatPanelWidth] = useState<number>(
    CHAT_PANEL.DEFAULT_WIDTH,
  );

  // Chat panel visibility monitoring using vibe APIs
  useEffect(() => {
    const cleanup = window.vibe?.interface?.onChatPanelVisibilityChanged?.(
      isVisible => {
        setChatPanelVisible(isVisible);
      },
    );

    return cleanup;
  }, []);

  const contextValue: LayoutContextType = {
    isChatPanelVisible,
    chatPanelWidth,
    setChatPanelVisible,
    setChatPanelWidth,
  };

  return (
    <LayoutContext.Provider value={contextValue}>
      <div
        className="browser-layout-root"
        style={
          {
            "--chat-panel-width": `${chatPanelWidth}px`,
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </LayoutContext.Provider>
  );
}

/**
 * Chat Panel Sidebar
 */
function ChatPanelSidebar(): React.JSX.Element | null {
  const { isChatPanelVisible, chatPanelWidth } = useLayout();

  if (!isChatPanelVisible) {
    return null;
  }

  return (
    <div
      className="chat-panel-sidebar"
      style={{
        width: `${chatPanelWidth}px`,
        minWidth: `${CHAT_PANEL.MIN_WIDTH}px`,
        maxWidth: `${CHAT_PANEL.MAX_WIDTH}px`,
      }}
    >
      <div className="chat-panel-content">
        {/* Remove header for cleaner look */}
        <div className="chat-panel-body">
          <ChatErrorBoundary>
            <ChatPage />
          </ChatErrorBoundary>
        </div>
      </div>
    </div>
  );
}

/**
 * Browser Content Area - Just the web page content
 */
function BrowserContentArea(): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");

  // Tab state monitoring using vibe APIs
  useEffect(() => {
    const unsubscribe = window.vibe?.tabs?.onTabStateUpdate?.(state => {
      setIsLoading(state.isLoading || false);
      setCurrentUrl(state.url || "");
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  return (
    <div className="browser-view-content">
      {isLoading ? (
        <div className="loading-state">
          <div className="loading-spinner animate-spin-custom"></div>
          <span>Loading...</span>
        </div>
      ) : currentUrl ? (
        <div className="ready-state" style={{ display: "none" }}>
          {/* Hide placeholder completely until webview renders */}
        </div>
      ) : (
        <div className="ready-state">
          <div className="welcome-message">
            <h2>Welcome to Vibe Browser</h2>
            <p>Enter a URL in the address bar to get started</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Chrome Areas - Tab bar and navigation bar outside content area
 */
function ChromeAreas(): React.JSX.Element {
  return (
    <>
      {/* Tab Bar - Full width, outside content area */}
      <div className="tab-bar-container">
        <ChromeTabBar />
      </div>

      {/* Navigation Bar - Full width, outside content area */}
      <div className="navigation-bar-container">
        <NavigationBar />
      </div>
    </>
  );
}

/**
 * Main Content Wrapper - Content + Chat layout
 */
function MainContentWrapper(): React.JSX.Element {
  return (
    <div className="main-content-wrapper">
      <BrowserContentArea />
      <ChatPanelSidebar />
    </div>
  );
}

/**
 * Browser Layout - Core layout
 */
function BrowserLayout(): React.JSX.Element {
  return (
    <div className="browser-window">
      <ChromeAreas />
      <MainContentWrapper />
    </div>
  );
}

/**
 * Main App Component - Clean and lean
 */
export function MainApp(): React.JSX.Element {
  const [isReady, setIsReady] = useState(false);
  const [vibeAPIReady, setVibeAPIReady] = useState(false);

  // Check if vibe API is available
  useEffect(() => {
    const checkVibeAPI = () => {
      if (
        typeof window !== "undefined" &&
        window.vibe &&
        window.vibe.tabs &&
        window.vibe.app
      ) {
        setVibeAPIReady(true);
      } else {
        // Retry after a short delay
        setTimeout(checkVibeAPI, 50);
      }
    };

    checkVibeAPI();
  }, []);

  // Smooth initialization
  useEffect(() => {
    if (vibeAPIReady) {
      setTimeout(() => {
        setIsReady(true);
      }, 100);
    }
  }, [vibeAPIReady]);

  return (
    <LayoutProvider>
      <div className={`glass-background-root ${isReady ? "ready" : ""}`}>
        <div className="glass-content-wrapper">
          <div className="browser-ui-root">
            {vibeAPIReady ? (
              <BrowserLayout />
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100vh",
                  flexDirection: "column",
                  background: "var(--app-background)",
                  color: "var(--text-primary)",
                }}
              >
                <div style={{ fontSize: "18px", marginBottom: "10px" }}>
                  ⏳ Initializing Vibe Browser...
                </div>
                <div
                  style={{ fontSize: "14px", color: "var(--text-secondary)" }}
                >
                  Loading interface components
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </LayoutProvider>
  );
}
