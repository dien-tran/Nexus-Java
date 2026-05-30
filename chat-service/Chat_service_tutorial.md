# Hướng dẫn chi tiết: chat-service (Nexus Chat Service)

Tài liệu này chuyển toàn bộ phần giải thích trước đó thành một hướng dẫn có cấu trúc, chi tiết, và thực tế — bằng tiếng Việt. Mục tiêu: giúp bạn hiểu từ tỉ mỉ (dòng‑dòng) tới kiến trúc cấp cao, lý do thiết kế, những rủi ro và cách mở rộng.

## Mục lục

1. Tổng quan nhanh
2. Phân tích cấu trúc dự án
3. Kiến trúc tổng quan & luồng request
4. Giải thích `api_server.py` (entrypoint) — mã và từng dòng
5. Core: `llm_client.py`, `config.py`, `security.py`
6. Orchestrator (LangGraph): `orchestrator_graph.py` (logic, từng bước)
7. Tool Registry: `tool_registry.py` (whitelist tools)
8. Database layer: `work_db.py` (SQL, phân quyền, thiết kế)
9. System prompt: `system_prompt.py` (ý nghĩa, cách dùng)
10. Công nghệ chính & notes production
11. Bảo mật, privacy và production hardening
12. Performance & scaling
13. Observability & testing
14. Bài tập, câu hỏi phỏng vấn và bước tiếp theo

---

## 1. Tổng quan nhanh

`chat-service` là một microservice Python (FastAPI) cung cấp chatbot AI cho Nexus, phiên bản hiện tại (V1) tập trung trả lời câu hỏi liên quan `plan` và `task` của người dùng đã đăng nhập. Thiết kế chính: AI chỉ hiểu ngôn ngữ và chọn tool; backend thực thi query SQL an toàn và trả kết quả về cho AI để diễn giải. Mục tiêu thiết kế: an toàn dữ liệu, dễ mở rộng, dễ kiểm thử.

---

## 2. Phân tích cấu trúc dự án

Cấu trúc chính (thư mục `chat-service`):

- `api_server.py` — entrypoint FastAPI; endpoints `/health` và `/message`.
- `core/`
  - `config.py` — cấu hình (pydantic-settings)
  - `llm_client.py` — wrapper LLM (OpenAI-compatible)
  - `security.py` — xác thực JWT, trả `CurrentUser`
- `agents/`
  - `orchestrator_graph.py` — luồng xử lý chính (LangGraph)
  - `tool_registry.py` — danh sách tool whitelist
- `db/`
  - `work_db.py` — truy vấn MySQL qua SQLAlchemy Core (parameterized SQL)
- `prompts/`
  - `system_prompt.py` — prompt điều hướng hành vi LLM
- `tools/`
  - `plan_tools.py`, `task_tools.py` — placeholder cho tách logic tool khi mở rộng
- `requirements.txt`, `Dockerfile`, `.env.example`, `Chat-service.md`

Mỗi thành phần có trách nhiệm rõ ràng: entrypoint (expose API), core (config, security, LLM), agents (orchestration), db (data access), prompts (behavior), tools (handlers mở rộng).

---

## 3. Kiến trúc tổng quan & luồng request

Luồng request (text-based diagram):

Client (frontend)
  -> API Gateway (/api/chatbot/**, StripPrefix=2)
    -> chat-service `/message` (FastAPI)
      - Xác thực JWT -> lấy `user_id`
      - Orchestrator (LangGraph): classify_intent -> select_tool -> execute_tool -> generate_answer
        - ToolRegistry -> WorkDb (MySQL)
        - LLM (OpenAI-compatible) được gọi ở classify/select/generate (nếu có API key)

Thiết kế trọng tâm:
- LLM hiểu ngôn ngữ & chọn tool.
- Backend kiểm soát truy vấn SQL, phân quyền bằng `owner_user_id`.
- Hạn chế text-to-SQL để tránh rủi ro bảo mật và testability.

---

## 4. Giải thích `api_server.py` (entrypoint) — mã & phân tích từng dòng

Đây là phần mã chính:

```python
from typing import Any
from uuid import uuid4

from fastapi import Depends, FastAPI
from pydantic import BaseModel, Field

from agents.orchestrator_graph import OrchestratorGraph
from agents.tool_registry import ToolRegistry
from core.config import get_settings
from core.llm_client import LlmClient
from core.security import CurrentUser, get_current_user
from db.work_db import WorkDb


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    context: dict[str, Any] = Field(default_factory=dict)


class ChatResponse(BaseModel):
    reply: str
    selectedAgent: str
    traceId: str
    tool: str | None = None


settings = get_settings()
work_db = WorkDb()
tool_registry = ToolRegistry(work_db)
llm_client = LlmClient()
orchestrator = OrchestratorGraph(tool_registry, llm_client)

app = FastAPI(title="Nexus Chat Service", version="1.0.0")


@app.get("/health")
def health() -> dict[str, Any]:
    db_status = "UP"
    try:
        work_db.health()
    except Exception:
        db_status = "DOWN"
    return {
        "status": "UP",
        "database": db_status,
        "llmConfigured": bool(settings.llm_api_key),
    }


@app.post("/message", response_model=ChatResponse)
def message_endpoint(
    request: ChatRequest,
    current_user: CurrentUser = Depends(get_current_user),
) -> ChatResponse:
    trace_id = str(uuid4())
    result = orchestrator.ask(current_user.user_id, request.message)
    return ChatResponse(
        reply=result["reply"],
        selectedAgent=result["selectedAgent"],
        traceId=trace_id,
        tool=result.get("tool"),
    )
```

Giải thích quan trọng từng phần:
- `ChatRequest` / `ChatResponse` (Pydantic): validate input & output; giúp auto-generate OpenAPI.
- Tạo các singletons (`settings`, `WorkDb`, `ToolRegistry`, `LlmClient`, `OrchestratorGraph`) tại import-time: tiện nhưng cần chú ý lifecycle khi test hoặc deploy (prefer factories hoặc DI trong app factory nếu mở rộng).
- `/health`: kiểm tra DB connectivity và trạng thái LLM (dựa trên biến môi trường `LLM_API_KEY`).
- `/message`: Endpoint chính; `Depends(get_current_user)` lấy user từ JWT. Tạo `trace_id` cho correlation (hiện chưa log nhưng rất nên thêm logging). Gọi `orchestrator.ask(...)` để xử lý toàn bộ luồng.

Kiến nghị cải tiến:
- Thêm structured logging với traceId & user_id.
- Xem xét chuyển sang async nếu muốn throughput cao và non-blocking I/O.

Tóm tắt: `api_server` là thin wrapper; core logic nằm trong `OrchestratorGraph` và các lớp phụ.

---

## 5. Core: `llm_client.py`, `config.py`, `security.py`

### `core/config.py`
- Dùng `pydantic-settings` để đọc biến môi trường (với `.env`).
- Cung cấp `get_settings()` được cache để dùng làm singleton config.

Các biến chính:
- `CHAT_SERVICE_PORT`, `JWT_SIGNER_KEY`, `LLM_PROVIDER`, `LLM_MODEL`, `LLM_API_KEY`, `LLM_BASE_URL`, `WORK_DB_URL`, `SQL_DEFAULT_LIMIT`, `SQL_MAX_LIMIT`.

### `core/llm_client.py`
Trích (tinh gọn):

```python
class LlmClient:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.enabled = bool(self.settings.llm_api_key)
        self.client = None
        if self.enabled:
            kwargs = {"api_key": self.settings.llm_api_key}
            if self.settings.llm_base_url:
                kwargs["base_url"] = self.settings.llm_base_url
            self.client = OpenAI(**kwargs)

    def complete(self, messages, temperature=0.1) -> str: ...
    def complete_json(self, messages, fallback) -> dict: ...
```

Giải thích:
- Nếu không cấu hình API key, `LlmClient` disabled — service vẫn hoạt động dùng fallback heuristics.
- `complete_json` yêu cầu LLM trả JSON; nếu không parse được, trả `fallback`.
- Thiết kế giúp test local mà không cần LLM key.

Cải tiến production:
- Thêm timeout, retry, circuit-breaker, và logging.
- Xử lý sanitization (PII) trước khi gửi tới provider.

### `core/security.py`
Trích (tinh gọn):

```python
def get_current_user(authorization: str | None = Header(default=None)) -> CurrentUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401)
    token = authorization.removeprefix("Bearer ").strip()
    payload = jwt.decode(token, settings.jwt_signer_key, algorithms=["HS512"])
    user_id = payload.get("sub")
    roles = parse roles from payload
    return CurrentUser(user_id=str(user_id), roles=roles)
```

Giải thích:
- Verify JWT bằng `JWT_SIGNER_KEY` và algorithm HS512.
- Lấy `sub` làm `user_id`. Không tin bất kỳ userId nào từ body.

Cải tiến production:
- Sử dụng asymmetric key (RS256) + JWKS nếu muốn tách sign/verify.
- Lưu secrets ở secret manager và support rotation.

---

## 6. Orchestrator (LangGraph): `orchestrator_graph.py`

Đây là control plane: flow gồm 4 bước chính:
1. `classify_intent`
2. `select_tool`
3. `execute_tool`
4. `generate_answer`

Tại sao dùng LangGraph (StateGraph)?
- Rõ ràng, maintainable, dễ chèn node mới (ví dụ retrieval/RAG node).
- Giảm callback hell & giúp trace từng bước stateful.

Chi tiết từng node (tôi tóm tắt logic & lý do):

### classify_intent
- Gọi `llm.complete_json` với prompt yêu cầu trả JSON `{"intent":"..."}`.
- Fallback: `_heuristic_intent(message)` (keyword matching) nếu LLM disabled hoặc parse error.
- Validate intent: chỉ chấp nhận các intent đã định sẵn.

Tại sao: intent cần rõ ràng để chọn tool; fallback cho phép test local.

### select_tool
- Nếu intent unsupported/clarification_needed -> không chọn tool.
- Gọi LLM (với `SYSTEM_PROMPT` + danh sách tools từ `ToolRegistry.describe_for_prompt()`) để yêu cầu trả JSON `{"tool":"...","arguments":{...}}`.
- Nếu LLM chọn tool không có trong registry -> fallback heuristic `_heuristic_tool`.
- Important: prompt bắt buộc "Không được sinh SQL" và "Chỉ truyền tham số whitelist".

Tại sao: ngăn LLM tạo SQL hoặc truyền param lạ; server luôn validate.

### execute_tool
- Nếu có `selected_tool`, gọi `ToolRegistry.execute(user_id, tool_name, arguments)`.
- Handler do `ToolRegistry` đăng ký (thường call `WorkDb`).
- Catch exception -> gán `error` trong state để generate friendly message.

### generate_answer
- Nếu có lỗi -> trả lỗi thân thiện.
- Nếu intent unsupported/clarification_needed -> trả lời tương ứng.
- Nếu không có `tool_result` -> nói chưa tìm thấy dữ liệu.
- Nếu `llm` disabled -> trả deterministic `_deterministic_answer(state)` (dùng data tool_result để format).
- Nếu `llm` enabled -> gọi `llm.complete` với prompt "Chỉ dựa trên tool_result, không bịa thêm".

Lợi ích: đảm bảo kết quả luôn dựa trên dữ liệu backend; giảm risk hallucination.

---

## 7. Tool Registry: `tool_registry.py`

Cấu trúc:

- `ToolSpec` (dataclass): `name`, `description`, `parameters`, `handler`.
- `self.tools` là dict tool_name -> ToolSpec. Ví dụ có `get_overdue_tasks`, `search_my_tasks`, `summarize_my_work`, v.v.
- `describe_for_prompt()` trả danh sách tool + params để LLM biết options.
- `execute(user_id, tool_name, arguments)` validate tool_name tồn tại, chuyển arguments -> handler.

Tại sao:
- Whitelist parameters & handler đảm bảo LLM không trực tiếp tác động SQL.
- Central registry dễ audit & mở rộng.

Bài tập: thêm tool mới (ví dụ `get_completed_tasks`) yêu cầu: (1) implement trong `WorkDb`; (2) đăng ký ToolSpec.

---

## 8. Database layer: `work_db.py`

Thiết kế chính:
- Dùng SQLAlchemy Core `create_engine` (synchronous) với `pool_pre_ping=True`.
- Mỗi truy vấn task/plan đều join qua `plan` và có điều kiện `p.owner_user_id = :user_id` — bắt buộc để enforce ownership.
- SQL được build từ các điều kiện whitelist; parameters bind-safe dùng `text(...)` + params dict.
- Limit được clamp bởi `_limit()` (từ `SQL_DEFAULT_LIMIT`, `SQL_MAX_LIMIT`).

Ví dụ `search_my_tasks(...)` (tóm tắt):
- Build `conditions = ["p.owner_user_id = :user_id"]` và `params = {"user_id": user_id, "limit": self._limit(limit)}`.
- Nếu user pass keyword/status/... thì thêm điều kiện tương ứng (string matching, date filters).
- Chạy `conn.execute(sql, params)`.

Lý do & bảo mật:
- Parameterized SQL tránh SQL injection.
- Join qua `plan` để chắc user chỉ thấy dữ liệu của mình.
- Không dùng raw user-provided SQL.

Cải tiến production:
- Sử dụng read replicas, cache (Redis), query timeouts, prepared statements, connection pool tuning.

---

## 9. System prompt: `system_prompt.py`

Nội dung quy định behavior LLM: language (Tiếng Việt), persona (xưng "mình"), phạm vi (chỉ task/plan), quy tắc dữ liệu (chỉ dùng tool result, không bịa), xử lý xúc phạm, fallback messages.

Vai trò:
- Hướng dẫn LLM trả lời chính xác theo phong cách mong muốn.
- Không thay thế security backend; prompt là 1 layer bảo vệ nhưng chỉ là hướng dẫn.

---

## 10. Công nghệ chính & notes production

Các công nghệ:
- FastAPI: endpoint, DI, Pydantic validation.
- REST: client -> gateway -> service.
- OpenAI-compatible client: gọi LLM cho classify/select/generate.
- LangGraph: state graph orchestration.
- SQLAlchemy Core + PyMySQL: DB access.
- Docker: containerization.

Notes production:
- Thêm logging, metrics (Prometheus), tracing (OpenTelemetry).
- Rate limiting tại gateway & service.
- Secret management.
- Circuit breaker & retries cho LLM.

---

## 11. Bảo mật, privacy & production hardening

Checklist quan trọng:
- Secrets: store in secret manager; không commit.
- JWT: consider RS256 + JWKS for distributed verification.
- DB: least privilege DB user; avoid `root` in production.
- Logging: mask secrets, do not log full tokens.
- LLM: sanitize PII, cost control, rate-limits.
- Auditing: log tool calls (user_id, tool, arguments) without sensitive data.

---

## 12. Performance & scaling

Vấn đề hiện tại:
- Blocking LLM/DB calls -> blocking worker.
- Không caching.

Cải tiến:
- Convert stack sang async (async DB driver, async LLM calls) hoặc use threadpool for LLM calls.
- Add Redis cache for frequent queries.
- Horizontal scale multiple replicas behind gateway.
- Circuit-breaker for LLM provider.

---

## 13. Observability & testing

- Unit tests: test `ToolRegistry`, `WorkDb._limit`, orchestrator nodes with mocked LLM/DB.
- Integration tests: spin up MySQL test container & run end-to-end with fake LLM.
- Monitoring: Prometheus metrics + health/readiness, request latency histograms.
- Error tracking: Sentry / Rollbar.

---

## 14. Bài tập & câu hỏi phỏng vấn (thực hành và phỏng vấn)

Bài tập kỹ thuật:
1. Tạo JWT test (sign bằng `JWT_SIGNER_KEY` từ `.env.example`) và gọi `POST /message`.
2. Viết unit test cho `ToolRegistry.execute` với mock `WorkDb`.
3. Thêm tool `get_completed_tasks` và implement SQL trong `WorkDb`.
4. Chuyển `api_server.message_endpoint` sang phiên bản async và xử lý `orchestrator.ask` trong threadpool.

Câu hỏi phỏng vấn ý nghĩa:
1. Tại sao không cho LLM tự viết SQL? Hậu quả gì có thể xảy ra?
2. Nếu latency LLM p99 = 5s, bạn sẽ tối ưu như thế nào cho UX và throughput?
3. Làm sao đảm bảo LLM không "bịa" dữ liệu khi generate câu trả lời?
4. Làm thế nào để rotate JWT signing key mà vẫn giữ backward compatibility?

---

## 15. Những bước tiếp theo tôi gợi ý (chọn 1 để tôi làm tiếp)

- Đi sâu vào `agents/orchestrator_graph.py`: giải thích hàm helper, ví dụ prompt + response, viết unit tests.
- Viết unit tests mẫu cho `ToolRegistry` và `Orchestrator` (với mocked LLM/DB).
- Chuyển đổi service sang async (mẫu code & diff) và demo endpoint async.
- Thêm structured logging + traceId và mẫu instrumentation (OpenTelemetry + Prometheus).
- Thiết kế tích hợp RAG + vector DB (Qdrant) để hỗ trợ nâng cấp sau này.

---

## 16. Kết luận

File này tóm tắt toàn bộ phân tích đã thực hiện trước đó thành một tài liệu tham khảo chi tiết, dễ đọc và có hành động cụ thể. Nó cung cấp cả lý thuyết và hướng dẫn thực tế để bạn trở thành một kỹ sư backend/AI chuyên nghiệp khi làm việc với `chat-service`.

Bạn muốn tôi tạo thêm ví dụ test cụ thể, hoặc chuyển một phần code sang async như lựa chọn tiếp theo không?