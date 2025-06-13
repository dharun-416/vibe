import React from "react";
import { Tooltip } from "antd";
import "../styles/ChatView.css";

interface IconWithStatusProps {
  // Icon content
  children: React.ReactNode;

  // Status indicator
  status: "connected" | "disconnected" | "loading";
  statusTitle?: string;

  // Main icon/pill properties
  title?: string;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;

  // Whether to show as favicon pill or gmail pill
  variant?: "gmail" | "favicon";
}

export const IconWithStatus: React.FC<IconWithStatusProps> = ({
  children,
  status,
  statusTitle,
  title,
  onClick,
  className = "",
  style,
  variant = "gmail",
}) => {
  const pillClassName =
    variant === "gmail" ? "gmail-icon-pill" : "favicon-pill";

  const iconElement = (
    <div
      className={`${pillClassName} ${className}`}
      onClick={onClick}
      title={title}
      style={{
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );

  return (
    <div className="gmail-status-container">
      {/* Status indicator comes first */}
      <div className={`status-indicator-pill ${status}`} title={statusTitle}>
        <div className="status-dot" />
      </div>

      {/* Icon/pill comes second */}
      {variant === "favicon" && title ? (
        <Tooltip
          title={title}
          placement="topLeft"
          overlayStyle={{ maxWidth: 200 }}
        >
          {iconElement}
        </Tooltip>
      ) : (
        iconElement
      )}
    </div>
  );
};
