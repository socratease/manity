import os
from typing import Any, Dict, List, Optional

import httpx
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator


class Settings(BaseModel):
    openai_api_key: str = Field(default_factory=lambda: os.getenv("OPENAI_API_KEY", ""))


def get_settings() -> Settings:
    settings = Settings()
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OpenAI API key is not configured on the server.",
        )
    return settings


class ChatMessage(BaseModel):
    role: str
    content: str

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        allowed_roles = {"system", "user", "assistant"}
        if value not in allowed_roles:
            raise ValueError(f"role must be one of {', '.join(sorted(allowed_roles))}")
        return value

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("content must not be empty")
        return value


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: str = Field(default="gpt-5.1")
    response_format: Optional[Dict[str, Any]] = None

    @field_validator("messages")
    @classmethod
    def validate_messages(cls, value: List[ChatMessage]) -> List[ChatMessage]:
        if not value:
            raise ValueError("messages must contain at least one entry")
        return value


class ChatResponse(BaseModel):
    content: str
    raw: Dict[str, Any]


app = FastAPI(title="Manity API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/llm/chat", response_model=ChatResponse)
async def forward_chat(request: ChatRequest, settings: Settings = Depends(get_settings)) -> ChatResponse:
    payload: Dict[str, Any] = {
        "model": request.model,
        "messages": [message.model_dump() for message in request.messages],
    }
    if request.response_format:
        payload["response_format"] = request.response_format

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.openai_api_key}",
    }

    async with httpx.AsyncClient(timeout=httpx.Timeout(30.0)) as client:
        upstream_response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload,
        )

    if upstream_response.status_code >= 400:
        detail = upstream_response.text or "Failed to reach OpenAI"
        raise HTTPException(status_code=upstream_response.status_code, detail=detail)

    try:
        response_json = upstream_response.json()
    except ValueError as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=502, detail="Invalid response from OpenAI") from exc

    content = (
        response_json.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
    )

    if not isinstance(content, str):
        content = ""

    return ChatResponse(content=content, raw=response_json)
