import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Lightbulb, ChevronDown, ChevronRight } from "lucide-react";
import { markdownComponents } from "./markdown-components";

interface ReasoningDisplayProps {
  reasoning: string;
  isLive?: boolean;
}

export const ReasoningDisplay: React.FC<ReasoningDisplayProps> = ({
  reasoning,
  isLive = false,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(!isLive);
  const [previousReasoning, setPreviousReasoning] = React.useState(reasoning);
  const [reasoningComplete, setReasoningComplete] = React.useState(false);
  const [manuallyToggled, setManuallyToggled] = React.useState(false);

  React.useEffect(() => {
    if (isLive && reasoning !== previousReasoning) {
      setPreviousReasoning(reasoning);
      setReasoningComplete(false);
    }
  }, [reasoning, previousReasoning, isLive]);

  React.useEffect(() => {
    if (isLive && reasoning === previousReasoning && reasoning.length > 0) {
      const timer = setTimeout(() => {
        setReasoningComplete(true);
      }, 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [reasoning, previousReasoning, isLive]);

  React.useEffect(() => {
    if (reasoningComplete && !isCollapsed && !manuallyToggled) {
      const timer = setTimeout(() => {
        setIsCollapsed(true);
      }, 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [reasoningComplete, isCollapsed, manuallyToggled]);

  const handleToggle = (): void => {
    setIsCollapsed(!isCollapsed);
    setManuallyToggled(true);
  };

  return (
    <div className="reasoning-container">
      <div className="reasoning-header" onClick={handleToggle}>
        <Lightbulb
          className={`reasoning-icon ${isLive && !reasoningComplete ? "reasoning-active" : ""}`}
        />
        <span className="reasoning-label">
          {isLive && !reasoningComplete ? "Thinking..." : "Thinking Process"}
        </span>
        {isCollapsed ? (
          <ChevronRight className="reasoning-chevron" />
        ) : (
          <ChevronDown className="reasoning-chevron" />
        )}
      </div>
      {!isCollapsed && (
        <div className="reasoning-content">
          <ReactMarkdown
            components={markdownComponents}
            remarkPlugins={[remarkGfm]}
          >
            {reasoning}
          </ReactMarkdown>
          {isLive && !reasoningComplete && (
            <div className="reasoning-indicator">
              <div className="reasoning-dots">
                <div className="reasoning-dot"></div>
                <div className="reasoning-dot"></div>
                <div className="reasoning-dot"></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
