import React from "react";
import { MessageSquare, Globe, Mail, DollarSign } from "lucide-react";

interface ChatWelcomeProps {
  onActionClick: (prompt: string) => void;
}

export const ChatWelcome: React.FC<ChatWelcomeProps> = ({ onActionClick }) => {
  return (
    <div className="welcome-container">
      <div className="welcome-stamped-card">
        <div className="welcome-icon-wrapper">
          <MessageSquare className="welcome-icon" />
        </div>
        <h1 className="welcome-title">How can I help you today?</h1>
        <p className="welcome-subtitle">Click to try one of these:</p>

        <div className="action-chips-container">
          <button
            className="action-chip"
            onClick={() => onActionClick("Summarize this webpage")}
          >
            <Globe size={16} />
            <span>Summarize this webpage</span>
          </button>

          <button
            className="action-chip"
            onClick={() =>
              onActionClick("Send $5 to Ryan Florence via Venmo for lunch")
            }
          >
            <DollarSign size={16} />
            <span>Send $5 to Ryan for lunch</span>
          </button>

          <button
            className="action-chip"
            onClick={() =>
              onActionClick(
                "Draft an email to john@company.com about postponing tomorrow's 3pm meeting to Friday",
              )
            }
          >
            <Mail size={16} />
            <span>Reschedule tomorrow's meeting</span>
          </button>
        </div>
      </div>
    </div>
  );
};
