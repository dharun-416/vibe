import React from "react";

interface StreamingContent {
  reasoning?: string;
  response?: string;
}

export const useStreamingContent = () => {
  const [streamingContent, setStreamingContent] =
    React.useState<StreamingContent>({});

  const clearStreaming = () => {
    setStreamingContent({});
  };

  const updateStreaming = (content: StreamingContent) => {
    setStreamingContent(prev => ({
      ...prev,
      ...content,
    }));
  };

  return {
    streamingContent,
    setStreamingContent: updateStreaming,
    clearStreaming,
    hasLiveReasoning: Boolean(streamingContent.reasoning?.trim()),
    currentReasoningText: streamingContent.reasoning || "",
  };
};
