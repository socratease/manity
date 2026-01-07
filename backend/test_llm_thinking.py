"""Tests for LLM thinking extraction logic."""

import pytest


def extract_thinking_from_response(message_content):
    """
    Extract thinking and text content from OpenAI's extended thinking response format.

    Content can be a string or an array of content blocks with types "thinking" and "text".
    This mirrors the logic in main.py's proxy_llm_chat endpoint.
    """
    thinking = None
    if isinstance(message_content, list):
        thinking_parts = []
        text_parts = []
        for block in message_content:
            if isinstance(block, dict):
                if block.get("type") == "thinking":
                    thinking_parts.append(block.get("thinking", ""))
                elif block.get("type") == "text":
                    text_parts.append(block.get("text", ""))
        thinking = "\n".join(thinking_parts) if thinking_parts else None
        content = "\n".join(text_parts) if text_parts else ""
    else:
        content = message_content if message_content else ""

    return {"thinking": thinking, "content": content}


class TestExtractThinkingFromResponse:
    """Test suite for the thinking extraction logic."""

    def test_extract_thinking_from_array_content(self):
        """Should extract thinking from array content format."""
        message_content = [
            {"type": "thinking", "thinking": "Let me analyze this request..."},
            {"type": "text", "text": "Here is my answer."}
        ]

        result = extract_thinking_from_response(message_content)

        assert result["thinking"] == "Let me analyze this request..."
        assert result["content"] == "Here is my answer."

    def test_extract_multiple_thinking_blocks(self):
        """Should handle multiple thinking blocks joined with newlines."""
        message_content = [
            {"type": "thinking", "thinking": "First thought..."},
            {"type": "thinking", "thinking": "Second thought..."},
            {"type": "text", "text": "Final answer."}
        ]

        result = extract_thinking_from_response(message_content)

        assert result["thinking"] == "First thought...\nSecond thought..."
        assert result["content"] == "Final answer."

    def test_handle_string_content_without_thinking(self):
        """Should handle string content without thinking."""
        message_content = "Simple string response"

        result = extract_thinking_from_response(message_content)

        assert result["thinking"] is None
        assert result["content"] == "Simple string response"

    def test_handle_empty_string_content(self):
        """Should handle empty string content."""
        result = extract_thinking_from_response("")

        assert result["thinking"] is None
        assert result["content"] == ""

    def test_handle_none_content(self):
        """Should handle None content."""
        result = extract_thinking_from_response(None)

        assert result["thinking"] is None
        assert result["content"] == ""

    def test_array_with_only_text_blocks(self):
        """Should handle array with only text blocks (no thinking)."""
        message_content = [
            {"type": "text", "text": "Part 1."},
            {"type": "text", "text": "Part 2."}
        ]

        result = extract_thinking_from_response(message_content)

        assert result["thinking"] is None
        assert result["content"] == "Part 1.\nPart 2."

    def test_array_with_only_thinking_blocks(self):
        """Should handle array with only thinking blocks (no text)."""
        message_content = [
            {"type": "thinking", "thinking": "Thinking only..."}
        ]

        result = extract_thinking_from_response(message_content)

        assert result["thinking"] == "Thinking only..."
        assert result["content"] == ""

    def test_mixed_order_of_blocks(self):
        """Should handle blocks in any order."""
        message_content = [
            {"type": "text", "text": "First text."},
            {"type": "thinking", "thinking": "Thinking in the middle."},
            {"type": "text", "text": "Second text."}
        ]

        result = extract_thinking_from_response(message_content)

        assert result["thinking"] == "Thinking in the middle."
        assert result["content"] == "First text.\nSecond text."

    def test_empty_array(self):
        """Should handle empty array."""
        message_content = []

        result = extract_thinking_from_response(message_content)

        assert result["thinking"] is None
        assert result["content"] == ""

    def test_invalid_block_types_ignored(self):
        """Should ignore blocks with invalid or missing types."""
        message_content = [
            {"type": "thinking", "thinking": "Valid thinking."},
            {"type": "unknown", "data": "Should be ignored"},
            {"type": "text", "text": "Valid text."},
            {"no_type": "Missing type field"}
        ]

        result = extract_thinking_from_response(message_content)

        assert result["thinking"] == "Valid thinking."
        assert result["content"] == "Valid text."

    def test_blocks_with_empty_content(self):
        """Should handle blocks with empty content strings."""
        message_content = [
            {"type": "thinking", "thinking": ""},
            {"type": "text", "text": "Non-empty text."}
        ]

        result = extract_thinking_from_response(message_content)

        # Empty thinking is still joined but results in empty string
        assert result["thinking"] == ""
        assert result["content"] == "Non-empty text."
