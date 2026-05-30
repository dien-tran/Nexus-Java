from typing import Any
from uuid import uuid4

from fastapi import Depends, FastAPI
from pydantic import BaseModel, Field

from agents.orchestrator import SimpleOrchestrator
from agents.tool_registry import ToolRegistry
from clients.work_client import WorkServiceClient
from core.config import get_settings
from core.llm_client import LlmClient
from core.security import CurrentUser, get_current_user


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    context: dict[str, Any] = Field(default_factory=dict)


class ChatResponse(BaseModel):
    reply: str
    selectedAgent: str
    traceId: str
    tool: str | None = None


settings = get_settings()
work_client = WorkServiceClient()
tool_registry = ToolRegistry(work_client)
llm_client = LlmClient()
orchestrator = SimpleOrchestrator(tool_registry, llm_client)

app = FastAPI(title="Nexus Chat Service", version="1.0.0")


@app.get("/health")
def health() -> dict[str, Any]:
    work_service_status = "UP"
    try:
        work_client.health()
    except Exception:
        work_service_status = "DOWN"
    return {
        "status": "UP",
        "workService": work_service_status,
        "llmConfigured": llm_client.enabled,
    }


@app.post("/message", response_model=ChatResponse)
def message_endpoint(
    request: ChatRequest,
    current_user: CurrentUser = Depends(get_current_user),
) -> ChatResponse:
    trace_id = str(uuid4())
    result = orchestrator.ask(current_user.user_id, current_user.bearer_token, request.message)
    return ChatResponse(
        reply=result["reply"],
        selectedAgent=result["selectedAgent"],
        traceId=trace_id,
        tool=result.get("tool"),
    )
