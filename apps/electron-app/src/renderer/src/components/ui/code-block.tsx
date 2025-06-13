import React from "react";
import classnames from "classnames";

interface CodeBlockProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  inline,
  className,
  children,
  ...props
}) => {
  const match = /language-(\w+)/.exec(className || "");
  return !inline && match ? (
    <pre className={classnames(className, "markdown-code-block")} {...props}>
      <code>{String(children).replace(/\n$/, "")}</code>
    </pre>
  ) : (
    <code className={classnames(className, "text-sm")} {...props}>
      {children}
    </code>
  );
};
