import React from "react";

interface StatusIndicatorProps {
  status: "loading" | "connected" | "disconnected";
  title: string;
  show: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  title,
  show,
}) => {
  if (!show) return null;

  return (
    <div className={`status-indicator-pill ${status}`} title={title}>
      <div className="status-dot" />
    </div>
  );
};
