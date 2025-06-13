import React from "react";
import { Tooltip } from "antd";

interface FaviconPillProps {
  favicon?: string;
  title?: string;
  tooltipTitle?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const FaviconPill: React.FC<FaviconPillProps> = ({
  favicon,
  title,
  tooltipTitle,
  style,
  children,
}) => {
  const content = (
    <div className="favicon-pill" style={style}>
      {children || (
        <>
          {favicon && favicon !== "" ? (
            <img
              src={favicon}
              alt={title || "Tab"}
              onError={e => {
                (e.target as HTMLImageElement).style.display = "none";
                const placeholder = (e.target as HTMLImageElement)
                  .nextElementSibling;
                if (placeholder) {
                  (placeholder as HTMLElement).style.display = "flex";
                }
              }}
            />
          ) : null}
          <div
            className="favicon-pill-placeholder"
            style={{
              display: favicon && favicon !== "" ? "none" : "flex",
            }}
          >
            {(title || "T").charAt(0).toUpperCase()}
          </div>
        </>
      )}
    </div>
  );

  if (tooltipTitle) {
    return (
      <Tooltip
        title={tooltipTitle}
        placement="topLeft"
        overlayStyle={{ maxWidth: 200 }}
      >
        {content}
      </Tooltip>
    );
  }

  return content;
};
