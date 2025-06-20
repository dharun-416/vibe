import type { CoreMessage } from "ai";
import type { StreamResponse } from "@vibe/shared-types";
import type { ReActStreamPart } from "../react/react-processor.js";
import type { CoActStreamPart } from "../react/coact-processor.js";
import type { ReactObservation } from "../react/types.js";

export type ProcessorType = "react" | "coact";
export type CombinedStreamPart = ReActStreamPart | CoActStreamPart;

export interface IToolManager {
  getTools(): Promise<any>;
  executeTools(
    toolName: string,
    args: any,
    toolCallId: string,
  ): Promise<ReactObservation>;
  formatToolsForReact(): Promise<string>;
  saveTabMemory(url: string, title: string, content: string): Promise<void>;
  saveConversationMemory(userMessage: string, response: string): Promise<void>;
  getConversationHistory(): Promise<CoreMessage[]>;
  clearToolCache(): void;
}

export interface IStreamProcessor {
  processStreamPart(part: CombinedStreamPart): StreamResponse | null;
}

export interface IAgentConfig {
  model?: string;
  processorType?: ProcessorType;
}
