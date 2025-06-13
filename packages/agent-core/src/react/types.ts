/**
 * ReAct Framework Types
 * Types for the ReAct (Reason + Act) prompting framework
 */

export interface ParsedReactToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ReactObservation {
  tool_call_id: string;
  tool_name: string;
  result: any;
  error?: string;
}

export type ToolExecutor = (
  toolName: string,
  args: any,
  toolCallId: string,
  activeCdpTargetId?: string | null,
) => Promise<ReactObservation>;
