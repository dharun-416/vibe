import React from "react";
import { Globe, ChevronDown, ChevronRight } from "lucide-react";

interface BrowserProgressDisplayProps {
  progressText: string;
  isLive?: boolean;
}

export const BrowserProgressDisplay: React.FC<BrowserProgressDisplayProps> = ({
  progressText,
  isLive = false,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [manuallyToggled, setManuallyToggled] = React.useState(false);
  const [hasEverBeenLive, setHasEverBeenLive] = React.useState(isLive);

  React.useEffect(() => {
    if (isLive) {
      setHasEverBeenLive(true);
    }
  }, [isLive]);

  React.useEffect(() => {
    if (!isLive && !isCollapsed && !manuallyToggled && hasEverBeenLive) {
      const timer = setTimeout(() => {
        setIsCollapsed(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isLive, isCollapsed, manuallyToggled, hasEverBeenLive]);

  const handleToggle = (): void => {
    setIsCollapsed(!isCollapsed);
    setManuallyToggled(true);
  };

  return (
    <div className="browser-progress-container">
      <div className="browser-progress-header" onClick={handleToggle}>
        <Globe
          className={`browser-progress-icon ${isLive ? "browser-progress-active" : ""}`}
          size={16}
        />
        <span className="browser-progress-label">
          {isLive ? "Browser Working..." : "Browser Actions"}
        </span>
        {isCollapsed ? (
          <ChevronRight className="browser-progress-chevron" />
        ) : (
          <ChevronDown className="browser-progress-chevron" />
        )}
      </div>
      {!isCollapsed && (
        <div className="browser-progress-content">
          <div className="browser-progress-text">{progressText}</div>
        </div>
      )}
    </div>
  );
};
