export const IPC_CHANNELS = {
  CHAT_STREAM_RESPONSE_SETUP: "chat-stream-response-setup",
  CHAT_STREAM_REQUEST: "chat-stream-request",
  AGENT_PROGRESS_UPDATE: "agent-progress-update",
  ZESTUND_SET_STATE: "zustand-setState",
  TAB_UPDATE: "tab-update",
  TAB_SWITCH: "tab-switch",
  GET_ACTIVE_TAB: "get-active-tab",
  // Gmail OAuth channels
  GMAIL_CHECK_AUTH: "gmail-check-auth",
  GMAIL_START_AUTH: "gmail-start-auth",
  GMAIL_CLEAR_AUTH: "gmail-clear-auth",
  GMAIL_AUTH_SUCCESS: "gmail-auth-success",
  // Add other IPC channel constants here
};
