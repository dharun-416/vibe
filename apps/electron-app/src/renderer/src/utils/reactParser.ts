export const parseReActContent = (
  content: string,
  existingParts?: any[],
  isStreaming: boolean = false,
): any[] => {
  if (existingParts && existingParts.length > 0) {
    return existingParts;
  }

  const parts: any[] = [];
  const thinkingRegex = /<thought>([\s\S]*?)<\/thought>/g;
  const toolCallRegex =
    /<tool_call>\s*<invoke name="([^"]*)">\s*<parameter name="([^"]*)">([\s\S]*?)<\/parameter>\s*<\/invoke>\s*<\/tool_call>/g;
  const observationRegex = /<observation>([\s\S]*?)<\/observation>/g;
  const responseRegex = /<response>([\s\S]*?)<\/response>/g;

  let hasReActContent = false;

  if (isStreaming) {
    const incompleteTagPattern =
      /<(?:thought|tool_call|observation|response)(?:[^>]*)?(?:>.*)?$/;
    if (incompleteTagPattern.test(content)) {
      const lastCompleteIndex = content.search(
        /<(?:thought|tool_call|observation|response)/,
      );
      if (lastCompleteIndex > 0) {
        content = content.substring(0, lastCompleteIndex).trim();
      } else {
        return [{ type: "text", text: "", isStreaming: true }];
      }
    }
  }

  let thinkingMatch;
  while ((thinkingMatch = thinkingRegex.exec(content)) !== null) {
    hasReActContent = true;
    parts.push({
      type: "reasoning",
      text: thinkingMatch[1].trim(),
      startIndex: thinkingMatch.index,
      endIndex: thinkingMatch.index + thinkingMatch[0].length,
    });
  }

  let toolMatch;
  while ((toolMatch = toolCallRegex.exec(content)) !== null) {
    hasReActContent = true;
    const toolName = toolMatch[1];
    const paramName = toolMatch[2];
    const paramValue = toolMatch[3];

    let toolArgs: any = {};
    try {
      toolArgs = JSON.parse(paramValue);
    } catch {
      toolArgs = { [paramName]: paramValue };
    }

    parts.push({
      type: "tool-invocation",
      tool_name: toolName,
      args: toolArgs,
      startIndex: toolMatch.index,
      endIndex: toolMatch.index + toolMatch[0].length,
    });
  }

  let observationMatch;
  while ((observationMatch = observationRegex.exec(content)) !== null) {
    hasReActContent = true;
    parts.push({
      type: "observation",
      text: observationMatch[1].trim(),
      startIndex: observationMatch.index,
      endIndex: observationMatch.index + observationMatch[0].length,
    });
  }

  let responseMatch;
  while ((responseMatch = responseRegex.exec(content)) !== null) {
    hasReActContent = true;
    parts.push({
      type: "response",
      text: responseMatch[1].trim(),
      startIndex: responseMatch.index,
      endIndex: responseMatch.index + responseMatch[0].length,
    });
  }

  parts.sort((a, b) => a.startIndex - b.startIndex);

  if (hasReActContent) {
    let currentIndex = 0;
    const finalParts: any[] = [];

    parts.forEach(part => {
      if (currentIndex < part.startIndex) {
        const textBefore = content.slice(currentIndex, part.startIndex).trim();
        if (textBefore) {
          finalParts.push({
            type: "text",
            text: textBefore,
          });
        }
      }

      const cleanPart = { ...part };
      delete cleanPart.startIndex;
      delete cleanPart.endIndex;
      finalParts.push(cleanPart);

      currentIndex = part.endIndex;
    });

    if (currentIndex < content.length) {
      const textAfter = content.slice(currentIndex).trim();
      if (textAfter) {
        finalParts.push({
          type: "text",
          text: textAfter,
        });
      }
    }

    return finalParts.length > 0
      ? finalParts
      : [{ type: "text", text: content }];
  }

  return [{ type: "text", text: content, isStreaming }];
};
