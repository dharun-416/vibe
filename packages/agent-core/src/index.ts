// Agent Core - Main export module
// Clean separation of concerns

export type {
  AgentConfig,
  ChatMessage,
  StreamResponse,
  ProgressEvent,
} from "./types.js";
// New Agent Architecture exports
export { Agent } from "./agent.js";
export { ToolManager } from "./managers/tool-manager.js";
export { StreamProcessor } from "./managers/stream-processor.js";
export type * from "./interfaces/index.js";
export { createAgent } from "./factory.js";

// ReAct and CoAct Framework exports
export {
  ReActProcessor,
  CoActProcessor,
  REACT_XML_TAGS,
  MAX_REACT_ITERATIONS,
  REACT_SYSTEM_PROMPT_TEMPLATE,
  extractXmlTagContent,
  parseReactToolCall,
} from "./react/index.js";
export type {
  ParsedReactToolCall,
  ReactObservation,
  ToolExecutor,
  CoActStreamPart,
} from "./react/index.js";

// Services
export { MCPConnectionService } from "./services/mcp-service.js";
