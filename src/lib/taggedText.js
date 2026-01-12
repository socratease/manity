export const parseTaggedText = (text) => {
  if (!text) return [];

  // Parse text with tags in both old format @[Display Name](type:value) and new format @Display
  const parts = [];
  let currentIndex = 0;

  // Combined regex: match old format or new format
  // Old format: @[Display Name](type:value)
  // New format: @DisplayName (word characters, spaces, and parentheses until space or end)
  // Mentions must start at the beginning of the string or after whitespace to avoid matching emails
  const combinedRegex = /(?<!\S)@\[([^\]]+)\]\(([^:]+):([^)]+)\)|(?<!\S)@([\w\s\(\),→.'-]+)(?=\s|$|[.!?])/g;
  let match;

  while ((match = combinedRegex.exec(text)) !== null) {
    // Add text before the tag
    if (match.index > currentIndex) {
      parts.push({
        type: 'text',
        content: text.substring(currentIndex, match.index),
      });
    }

    // Add the tag
    if (match[1]) {
      // Old format: @[Display](type:value)
      parts.push({
        type: 'tag',
        tagType: match[2],
        display: match[1],
        value: match[3],
      });
    } else if (match[4]) {
      // New format: @Display
      parts.push({
        type: 'tag',
        tagType: 'unknown',
        display: match[4],
        value: match[4],
      });
    }

    currentIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (currentIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(currentIndex),
    });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: text }];
};
