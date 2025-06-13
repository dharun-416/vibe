import { type Components } from "react-markdown";
import { CodeBlock } from "./code-block";
import { SmartLink } from "./smart-link";

export const markdownComponents: Partial<Components> = {
  code: CodeBlock,
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  a: SmartLink,
};
