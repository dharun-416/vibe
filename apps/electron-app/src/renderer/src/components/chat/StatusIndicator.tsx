import React from "react";

interface AgentStatusIndicatorProps {
  isInitializing: boolean;
}

export const AgentStatusIndicator: React.FC<AgentStatusIndicatorProps> = ({
  isInitializing,
}) => {
  if (!isInitializing) return null;

  return (
    <div
      className="agent-init-status"
      style={{
        padding: "16px",
        textAlign: "center",
        backgroundColor: "#f8f9fa",
        borderBottom: "1px solid #e9ecef",
        fontSize: "14px",
        color: "#6c757d",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        <div
          style={{
            width: "16px",
            height: "16px",
            border: "2px solid #dee2e6",
            borderTop: "2px solid #007bff",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        ></div>
        <span>Connecting to agent...</span>
      </div>
    </div>
  );
};
