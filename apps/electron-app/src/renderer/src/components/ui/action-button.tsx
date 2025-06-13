import React from "react";
import { ArrowUp, Square } from "lucide-react";

interface ActionButtonProps {
  variant: "send" | "stop";
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  variant,
  onClick,
  disabled = false,
  className = "",
}) => {
  const isSend = variant === "send";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${className} ${variant === "stop" ? "stop-button-active" : ""}`}
      title={isSend ? "Send message" : "Stop generation"}
    >
      {isSend ? <ArrowUp size={16} /> : <Square size={14} />}
    </button>
  );
};
