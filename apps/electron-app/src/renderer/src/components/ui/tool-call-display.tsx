import React from "react";
import { Wrench, ChevronDown, ChevronRight } from "lucide-react";

interface ToolCallDisplayProps {
  toolName: string;
  toolArgs?: any;
  isLive?: boolean;
}

export const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({
  toolName,
  toolArgs,
  isLive = false,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [manuallyToggled, setManuallyToggled] = React.useState(false);

  React.useEffect(() => {
    if (!isLive && !isCollapsed && !manuallyToggled) {
      const timer = setTimeout(() => {
        setIsCollapsed(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isLive, isCollapsed, manuallyToggled]);

  const handleToggle = (): void => {
    setIsCollapsed(!isCollapsed);
    setManuallyToggled(true);
  };

  return (
    <div className="tool-call-container">
      <div className="tool-call-header" onClick={handleToggle}>
        <Wrench
          className={`tool-call-icon ${isLive ? "tool-call-active" : ""}`}
          size={16}
        />
        <span className="tool-call-label">
          {isLive ? `Using ${toolName}...` : `Used ${toolName}`}
        </span>
        {isCollapsed ? (
          <ChevronRight className="tool-call-chevron" />
        ) : (
          <ChevronDown className="tool-call-chevron" />
        )}
      </div>
      {!isCollapsed && (
        <div className="tool-call-content">
          <div className="tool-call-details">
            <div className="tool-call-name">
              <strong>Tool:</strong> {toolName}
            </div>
            {toolArgs && (
              <div className="tool-call-args">
                <strong>Arguments:</strong>
                <pre className="tool-args-json">
                  {JSON.stringify(toolArgs, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
