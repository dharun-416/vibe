/**
 * ReAct and CoAct Frameworks
 * Exports for ReAct (Reason + Act) and CoAct (Coordinated Act) prompting frameworks
 */

export { ReActProcessor } from "./react-processor.js";
export { CoActProcessor, type CoActStreamPart } from "./coact-processor.js";
export { ProcessorFactory } from "./processor-factory.js";
export {
  REACT_XML_TAGS,
  MAX_REACT_ITERATIONS,
  REACT_SYSTEM_PROMPT_TEMPLATE,
} from "./config.js";
export { extractXmlTagContent, parseReactToolCall } from "./xml-parser.js";
export type {
  ParsedReactToolCall,
  ReactObservation,
  ToolExecutor,
} from "./types.js";
