# Chat Service Code Walkthrough

File này giải thích cách `chat-service` hoạt động trong dự án Nexus Flow, theo hướng học để tự xây một chatbot backend tương tự.

## 1. Chat Service Là Gì?

`chat-service` là một service FastAPI chạy riêng ở port `8090`. Nhiệm vụ của nó là nhận câu hỏi từ frontend, xác thực người dùng bằng JWT, đọc dữ liệu plan/task từ `work-service`, rồi tạo câu trả lời tiếng Việt cho người dùng.

Trong kiến trúc tổng thể:

```text
Frontend
  |
  | POST /api/chatbot/message
  v
API Gateway :8080
  |
  | StripPrefix=2
  v
chat-service :8090
  |
  | gọi /plans, /tasks, /dashboard/summary bằng JWT người dùng
  v
work-service :8082
```

Endpoint public mà frontend gọi là:

```http
POST /api/chatbot/message
```

API Gateway route sang chat-service thành:

```http
POST /message
```

## 2. Cấu Trúc Thư Mục

```text
chat-service/
├── api_server.py                 # FastAPI entrypoint
├── requirements.txt              # Python dependencies
├── Dockerfile                    # Build container cho chat-service
├── .env                          # Biến môi trường local
├── core/
│   ├── config.py                 # Load env/config
│   ├── security.py               # Decode JWT, lấy current user
│   └── llm_client.py             # Wrapper gọi OpenAI-compatible API
├── agents/
│   ├── orchestrator.py           # Điều phối intent -> tool -> answer
│   ├── tool_registry.py          # Danh sách tool whitelist
│   ├── text_to_sql_agent.py      # Stub: chưa bật text-to-SQL
│   └── rag_agent.py              # Stub: chưa bật RAG
├── clients/
│   └── work_client.py            # HTTP client gọi work-service
├── prompts/
│   └── system_prompt.py          # System prompt, tool prompt, answer prompt
└── tools/
    ├── plan_tools.py             # Re-export ToolRegistry
    └── task_tools.py             # Re-export ToolRegistry
```

## 3. Dependencies Chính

Trong `requirements.txt`:

```text
fastapi
uvicorn
pydantic
pydantic-settings
python-jose[cryptography]
openai
httpx
```

Vai trò:

- `fastapi`: tạo HTTP API.
- `uvicorn`: chạy ASGI server.
- `pydantic`: validate request/response.
- `pydantic-settings`: load `.env`.
- `python-jose`: decode JWT.
- `openai`: gọi LLM theo chuẩn OpenAI-compatible, dùng được OpenAI/OpenRouter.
- `httpx`: gọi HTTP sang `work-service`.

## 4. Biến Môi Trường

File: `core/config.py`

```py
class Settings(BaseSettings):
    chat_service_port: int
    jwt_signer_key: str
    llm_provider: str
    llm_model: str
    llm_api_key: Optional[str]
    llm_base_url: Optional[str]
    work_service_base_url: str
    work_service_timeout_seconds: float
```

Các biến quan trọng:

```env
CHAT_SERVICE_PORT=8090
JWT_SIGNER_KEY=...
LLM_PROVIDER=openrouter
LLM_MODEL=openai/gpt-4o-mini
LLM_API_KEY=...
LLM_BASE_URL=https://openrouter.ai/api/v1
WORK_SERVICE_BASE_URL=http://work-service:8082
WORK_SERVICE_TIMEOUT_SECONDS=5
```

Trong Docker Compose, `chat-service` có:

```yaml
env_file:
  - ./chat-service/.env
```

Nghĩa là API key nên để trong `chat-service/.env`, không cần hardcode vào `docker-compose.yml`.

## 5. Entry Point FastAPI

File: `api_server.py`

Khi service start, các object chính được tạo một lần:

```py
settings = get_settings()
work_client = WorkServiceClient()
tool_registry = ToolRegistry(work_client)
llm_client = LlmClient()
orchestrator = SimpleOrchestrator(tool_registry, llm_client)
```

Ý nghĩa:

- `WorkServiceClient`: biết cách gọi `work-service`.
- `ToolRegistry`: chứa danh sách tool chatbot được phép dùng.
- `LlmClient`: gọi model AI.
- `SimpleOrchestrator`: điều phối toàn bộ luồng xử lý chat.

### Health Check

```py
@app.get("/health")
def health()
```

Endpoint này trả:

- `status`: trạng thái chat-service.
- `workService`: chat-service có gọi được work-service không.
- `llmConfigured`: đã có `LLM_API_KEY` và `LLM_MODEL` chưa.

### Message Endpoint

```py
@app.post("/message", response_model=ChatResponse)
def message_endpoint(request, current_user = Depends(get_current_user))
```

Request body:

```json
{
  "message": "Hôm nay tôi có task nào?",
  "context": {}
}
```

Response:

```json
{
  "reply": "Mình tìm thấy ...",
  "selectedAgent": "tool",
  "traceId": "...",
  "tool": "get_today_tasks"
}
```

Điểm quan trọng:

- `Depends(get_current_user)` bắt buộc request phải có `Authorization: Bearer <token>`.
- Chat-service không tin userId từ message.
- UserId lấy từ JWT subject.
- Token gốc được truyền tiếp sang `work-service`.

## 6. Xác Thực JWT

File: `core/security.py`

```py
def get_current_user(authorization: str | None = Header(default=None)) -> CurrentUser:
```

Luồng:

1. Kiểm tra header `Authorization`.
2. Header phải bắt đầu bằng `Bearer `.
3. Tách token.
4. Decode token bằng `JWT_SIGNER_KEY`.
5. Algorithm là `HS512`.
6. Lấy `sub` làm `user_id`.
7. Lấy `scope` hoặc `roles` nếu có.

Kết quả trả về:

```py
CurrentUser(
    user_id="...",
    roles=[...],
    bearer_token="..."
)
```

Tại sao phải truyền tiếp `bearer_token`?

Vì `work-service` cũng validate JWT và tự phân quyền theo user hiện tại. Chat-service không được tự truy cập database hoặc tự giả lập quyền.

## 7. LLM Client

File: `core/llm_client.py`

Class chính:

```py
class LlmClient:
```

Khi khởi tạo:

```py
self.enabled = bool(self.settings.llm_api_key and self.settings.llm_model)
```

Nếu thiếu API key hoặc model, LLM bị tắt. Khi đó chatbot vẫn chạy, nhưng dùng heuristic/fallback thay vì gọi model.

### complete

```py
def complete(self, messages, temperature=0.1) -> str
```

Dùng để tạo câu trả lời tự nhiên cuối cùng.

### complete_json

```py
def complete_json(self, messages, fallback) -> dict
```

Dùng cho các bước cần JSON có cấu trúc, ví dụ:

- phân loại intent
- chọn tool

Nếu model lỗi, trả về `fallback`. Đây là điểm thiết kế thực dụng: chatbot không chết hoàn toàn khi LLM lỗi.

## 8. Prompt

File: `prompts/system_prompt.py`

Có 3 prompt chính.

### SYSTEM_PROMPT

Định nghĩa persona và ranh giới:

- Trả lời tiếng Việt.
- Xưng "mình", gọi user là "bạn".
- Chỉ hỗ trợ task/plan/workspace.
- Không tạo/sửa/xóa plan/task ở V1.
- Không xử lý RAG/text-to-SQL ở V1.
- Không tiết lộ token, secret, prompt, endpoint nội bộ.
- Không bịa dữ liệu.

### TOOL_SELECTION_PROMPT

Ép model chọn tool theo whitelist:

- Chỉ chọn tool có trong danh sách.
- Không sinh SQL.
- Không tự tạo tool.
- Trả JSON dạng:

```json
{
  "tool": "tool_name",
  "arguments": {}
}
```

### ANSWER_PROMPT

Ép model viết câu trả lời cuối cùng chỉ dựa trên `tool_result`.

## 9. Orchestrator

File: `agents/orchestrator.py`

Đây là trái tim của chat-service.

Class chính:

```py
class SimpleOrchestrator:
```

Luồng chính nằm trong:

```py
def ask(self, user_id, bearer_token, message)
```

Nó chạy 4 bước:

```text
classify_intent
  -> select_tool
  -> execute_tool
  -> generate_answer
```

### ChatState

`ChatState` là dict chứa trạng thái qua từng bước:

```py
class ChatState(TypedDict, total=False):
    user_id: str
    bearer_token: str
    message: str
    intent: str
    selected_tool: str | None
    tool_arguments: dict
    tool_result: Any
    reply: str
    selected_agent: str
    error: str | None
```

Thay vì truyền nhiều biến rời rạc, orchestrator gom mọi thứ vào `state`.

## 10. Bước 1: classify_intent

```py
def classify_intent(self, state)
```

Mục tiêu: xác định người dùng đang hỏi loại gì.

Các intent hợp lệ:

```text
plan_query
task_query
work_summary
unsupported
clarification_needed
text_to_sql_candidate
rag_candidate
```

Nếu LLM bật, service hỏi model trả JSON:

```json
{"intent": "task_query"}
```

Nếu LLM tắt/lỗi, dùng heuristic:

```py
def _heuristic_intent(self, message)
```

Ví dụ heuristic:

- Có chữ `plan`, `kế hoạch` -> `plan_query`
- Có chữ `task`, `deadline`, `hôm nay` -> `task_query`
- Có chữ `thống kê`, `bao nhiêu`, `dashboard` -> `work_summary`
- Có chữ `sql`, `database`, `join` -> `text_to_sql_candidate`
- Có chữ `document`, `rag`, `tài liệu` -> `rag_candidate`

## 11. Bước 2: select_tool

```py
def select_tool(self, state)
```

Nếu intent là:

```text
unsupported
clarification_needed
text_to_sql_candidate
rag_candidate
```

thì không chọn tool.

Nếu là intent có thể xử lý, orchestrator đưa cho LLM:

- ngày hiện tại
- danh sách tool whitelist
- intent
- câu hỏi user

LLM trả về:

```json
{
  "tool": "get_today_tasks",
  "arguments": {
    "limit": 10
  }
}
```

Nếu LLM không chọn được, dùng fallback:

```py
def _heuristic_tool(self, message, intent)
```

Ví dụ:

- "quá hạn" -> `get_overdue_tasks`
- "hôm nay" -> `get_today_tasks`
- "sắp tới", "tuần này" -> `get_upcoming_tasks`
- "dashboard", "tổng quan" -> `get_dashboard_summary`
- "ưu tiên" -> `summarize_my_work(groupBy=priority)`
- intent `plan_query` -> `search_my_plans`
- còn lại -> `search_my_tasks`

## 12. Bước 3: execute_tool

```py
def execute_tool(self, state)
```

Nếu không có tool:

- `text_to_sql_candidate` -> dùng `TextToSqlAgent`
- `rag_candidate` -> dùng `RagAgent`
- unsupported/clarification -> trả lời ở bước sau

Nếu có tool:

```py
result = self.registry.execute(
    bearer_token=state["bearer_token"],
    tool_name=tool_name,
    arguments=state["tool_arguments"],
)
```

Điểm quan trọng:

- Tool nhận token thật của user.
- Tool không nhận SQL.
- Tool chỉ được gọi trong whitelist.
- Tool arguments được lọc theo schema.

Nếu tool lỗi, state có:

```py
error = str(exc)
```

và câu trả lời cuối sẽ báo không lấy được dữ liệu.

## 13. Tool Registry

File: `agents/tool_registry.py`

`ToolRegistry` quản lý danh sách tool chatbot được phép dùng.

Mỗi tool là:

```py
@dataclass(frozen=True)
class ToolSpec:
    name: str
    description: str
    parameters: dict[str, str]
    handler: Callable
```

Tool registry hiện có các tool:

### Plan tools

```text
get_my_plans
get_plan_detail
search_my_plans
get_plan_statistics
```

### Task tools

```text
search_my_tasks
get_today_tasks
get_overdue_tasks
get_upcoming_tasks
get_task_statistics
```

### Summary tools

```text
summarize_my_work
get_dashboard_summary
```

### describe_for_prompt

```py
def describe_for_prompt(self)
```

Trả danh sách tool cho LLM đọc khi chọn tool:

```json
[
  {
    "name": "get_today_tasks",
    "description": "Lấy task có hạn hôm nay.",
    "parameters": {
      "limit": "int optional"
    }
  }
]
```

### execute

```py
def execute(self, bearer_token, tool_name, arguments)
```

Luồng:

1. Kiểm tra tool có tồn tại không.
2. Lọc arguments theo schema.
3. Gọi handler.

Lọc arguments giúp giảm rủi ro prompt injection. Nếu model cố gửi field lạ, field đó bị bỏ.

## 14. WorkServiceClient

File: `clients/work_client.py`

Đây là client gọi `work-service`.

Class:

```py
class WorkServiceClient:
```

Khi khởi tạo:

```py
self.base_url = settings.work_service_base_url.rstrip("/")
self.timeout = settings.work_service_timeout_seconds
```

Trong Docker:

```env
WORK_SERVICE_BASE_URL=http://work-service:8082
```

Khi chạy local ngoài Docker:

```env
WORK_SERVICE_BASE_URL=http://localhost:8082
```

### _get

Hàm lõi:

```py
def _get(self, bearer_token, path, params=None)
```

Nó gọi:

```py
httpx.get(
    f"{self.base_url}{path}",
    headers={"Authorization": f"Bearer {bearer_token}"},
    params=...
)
```

Tức là mọi request sang work-service đều dùng JWT của user hiện tại.

### _normalize_response

```py
def _normalize_response(self, payload)
```

Hỗ trợ nhiều kiểu response:

- response là list -> trả list
- response có `result` -> trả `result`
- response có `data` -> trả `data`
- response có `content` -> trả `content`

Điều này giúp client linh hoạt nếu backend đổi wrapper response.

### Các hàm gọi backend trực tiếp

```py
get_my_plans()
get_plan_detail()
search_my_plans()
get_plan_statistics()
search_my_tasks()
get_task_statistics()
get_dashboard_summary()
```

### Các hàm filter local

Một số filter backend chưa hỗ trợ trực tiếp, nên client lấy `/tasks` rồi lọc local:

```py
get_today_tasks()
get_overdue_tasks()
get_upcoming_tasks()
summarize_my_work()
```

Ví dụ `get_today_tasks`:

```py
today = date.today().isoformat()
tasks = self._filter_tasks(self._get(token, "/tasks"), due_before=today, due_after=today)
```

### Normalize enum

Backend dùng enum:

```text
TODO
IN_PROGRESS
REVIEW
COMPLETE
```

User có thể hỏi:

```text
done, completed, to do, doing
```

Client normalize về enum backend:

```py
_normalize_task_status()
_normalize_plan_status()
_normalize_priority()
```

Ví dụ:

```py
"completed" -> "COMPLETE"
"to do" -> "TODO"
"doing" -> "IN_PROGRESS"
```

## 15. Bước 4: generate_answer

```py
def generate_answer(self, state)
```

Luồng xử lý:

1. Nếu tool lỗi -> trả:

```text
Hiện tại mình chưa lấy được dữ liệu task/plan. Bạn thử lại sau một chút nhé.
```

2. Nếu unsupported -> trả:

```text
Mình hiện chỉ hỗ trợ các câu hỏi liên quan đến task và plan trong Nexus.
```

3. Nếu cần làm rõ -> hỏi lại.

4. Nếu text-to-SQL/RAG -> trả message disabled.

5. Nếu không có dữ liệu -> báo không tìm thấy.

6. Nếu có dữ liệu:
   - Tạo fallback deterministic.
   - Nếu LLM tắt -> trả fallback.
   - Nếu LLM bật -> đưa `tool_result` cho LLM viết câu trả lời đẹp hơn.

### Deterministic fallback

```py
def _deterministic_answer(self, state)
```

Đây là câu trả lời không cần LLM.

Nếu result là list:

```text
Mình tìm thấy 2 kết quả phù hợp:
- Task A | trạng thái: TODO | hạn: 2026-05-30
- Task B | trạng thái: COMPLETE | hạn: 2026-05-31
```

Nếu result là dict:

```text
Mình tìm thấy thông tin phù hợp:
- totalTasks: 10
- completedTasks: 3
```

Thiết kế này giúp chatbot vẫn hữu ích dù chưa cấu hình API key.

## 16. Text-to-SQL Agent

File: `agents/text_to_sql_agent.py`

Hiện chỉ là stub:

```py
class TextToSqlAgent:
    selected_agent = "text_to_sql_disabled"
```

Nếu user hỏi kiểu:

```text
viết SQL join bảng task và plan
```

Chatbot trả:

```text
Mình chưa hỗ trợ truy vấn dữ liệu phức tạp bằng text-to-SQL ở V1...
```

Lý do chưa bật:

- Text-to-SQL có rủi ro bảo mật cao.
- Dễ lộ schema.
- Dễ truy vấn vượt quyền user.
- Dự án hiện ưu tiên read-only tool whitelist.

## 17. RAG Agent

File: `agents/rag_agent.py`

Hiện cũng là stub:

```py
class RagAgent:
    selected_agent = "rag_disabled"
```

Nếu user hỏi tài liệu/file/RAG, chatbot báo chưa hỗ trợ.

## 18. Tool Files

Files:

```text
tools/plan_tools.py
tools/task_tools.py
```

Hiện hai file này chỉ re-export:

```py
from agents.tool_registry import ToolRegistry
```

Nghĩa là logic tool thật đang nằm trong `agents/tool_registry.py`, không nằm riêng trong hai file này.

Nếu muốn refactor về sau, có thể tách:

- `PlanTools`
- `TaskTools`
- `SummaryTools`

rồi registry chỉ đăng ký các tool đó.

## 19. Luồng End-to-End Ví Dụ

Người dùng hỏi:

```text
Hôm nay tôi có task nào?
```

Luồng chạy:

```text
1. Frontend gửi POST /api/chatbot/message
2. Gateway validate JWT
3. Gateway StripPrefix /api/chatbot -> /message
4. chat-service /message nhận request
5. get_current_user decode JWT, lấy user_id + bearer_token
6. orchestrator.ask(...)
7. classify_intent -> task_query
8. select_tool -> get_today_tasks
9. execute_tool -> ToolRegistry gọi WorkServiceClient.get_today_tasks
10. WorkServiceClient gọi GET http://work-service:8082/tasks với Authorization Bearer token
11. work-service tự lọc task theo ownerUserId từ JWT
12. WorkServiceClient lọc task có dueDate hôm nay
13. generate_answer dùng LLM hoặc fallback để trả lời
14. FastAPI trả ChatResponse cho frontend
```

## 20. Vì Sao Không Truy Cập Database Trực Tiếp?

Chat-service hiện đọc dữ liệu qua `work-service`, không query MySQL trực tiếp.

Lợi ích:

- Tôn trọng phân quyền của backend Java.
- Không lặp lại business rule ở Python.
- Không cần biết schema database.
- Giảm rủi ro SQL injection.
- Dễ thay đổi database sau này.

Điểm trade-off:

- Một số filter phải lọc local nếu work-service chưa có endpoint tương ứng.
- Nếu cần query phức tạp, nên thêm endpoint backend hoặc thiết kế query API an toàn, không vội bật text-to-SQL.

## 21. Cơ Chế Bảo Mật

Chat-service có nhiều lớp bảo vệ:

1. API Gateway validate JWT trước.
2. Chat-service tự decode JWT lại bằng `JWT_SIGNER_KEY`.
3. `work-service` cũng validate JWT.
4. Chat-service chỉ dùng token từ header, không tin userId trong message.
5. Tool whitelist, không cho LLM gọi tool tùy ý.
6. Tool arguments bị lọc theo schema.
7. Prompt cấm lộ token, secret, endpoint nội bộ.
8. Không sinh SQL.
9. Không truy cập database trực tiếp.

## 22. Cách Chạy Riêng Chat Service

Chạy bằng Docker Compose toàn dự án:

```powershell
docker compose up -d --build
```

Chạy riêng ngoài Docker:

```powershell
cd chat-service
pip install -r requirements.txt
uvicorn api_server:app --host 0.0.0.0 --port 8090
```

Khi chạy ngoài Docker, `.env` nên dùng:

```env
WORK_SERVICE_BASE_URL=http://localhost:8082
```

Khi chạy trong Docker Compose:

```env
WORK_SERVICE_BASE_URL=http://work-service:8082
```

Hiện `docker-compose.yml` đã set biến này cho container.

## 23. Cách Test Bằng Curl

Health:

```powershell
curl http://localhost:8090/health
```

Message cần JWT:

```powershell
curl -X POST http://localhost:8090/message `
  -H "Authorization: Bearer <JWT>" `
  -H "Content-Type: application/json" `
  -d "{\"message\":\"Hôm nay tôi có task nào?\"}"
```

Thông qua Gateway:

```powershell
curl -X POST http://localhost:8080/api/chatbot/message `
  -H "Authorization: Bearer <JWT>" `
  -H "Content-Type: application/json" `
  -d "{\"message\":\"Tóm tắt công việc của tôi\"}"
```

## 24. Muốn Tự Xây Chatbot Tương Tự Thì Làm Theo Thứ Tự Nào?

### Bước 1: Tạo API server

Tạo FastAPI app với endpoint:

```text
POST /message
GET /health
```

### Bước 2: Tạo lớp config

Dùng `pydantic-settings` để load:

- API key
- model
- base URL LLM
- service URL backend
- JWT secret

### Bước 3: Tạo security dependency

Viết dependency kiểu:

```py
current_user = Depends(get_current_user)
```

Mục tiêu:

- verify token
- lấy user id
- giữ bearer token để gọi backend

### Bước 4: Tạo backend client

Không cho chatbot query DB trực tiếp ngay từ đầu. Hãy tạo client gọi backend chính:

```py
WorkServiceClient
```

### Bước 5: Tạo tool registry

Định nghĩa tool whitelist:

```py
get_today_tasks
get_overdue_tasks
search_my_plans
get_dashboard_summary
```

Mỗi tool có:

- name
- description
- parameters
- handler

### Bước 6: Tạo orchestrator

Luồng tối thiểu:

```text
classify_intent -> select_tool -> execute_tool -> generate_answer
```

### Bước 7: Thêm fallback heuristic

Không phụ thuộc 100% vào LLM.

Nếu LLM lỗi, chatbot vẫn nên trả lời được các câu cơ bản.

### Bước 8: Thêm prompt guardrails

Prompt nên nói rõ:

- phạm vi chatbot
- không bịa dữ liệu
- không lộ secrets
- không sinh SQL
- chỉ dùng tool_result

### Bước 9: Sau này mới mở rộng RAG/Text-to-SQL

Chỉ bật khi đã có:

- phân quyền dữ liệu rõ ràng
- query sandbox
- whitelist schema/table
- audit log
- giới hạn read-only
- test bảo mật

## 25. Điểm Mạnh Của Thiết Kế Hiện Tại

- Đơn giản, dễ hiểu.
- Không phụ thuộc hoàn toàn vào LLM.
- Có fallback heuristic.
- Có tool whitelist.
- Dữ liệu đi qua backend có phân quyền.
- Dễ mở rộng thêm tool.
- Có Dockerfile và env config rõ ràng.

## 26. Điểm Có Thể Cải Tiến

### Tách tool theo domain

Hiện registry chứa tất cả tool. Có thể tách:

```text
PlanToolset
TaskToolset
DashboardToolset
```

### Thêm conversation memory

Hiện mỗi request độc lập. Có thể thêm:

- Redis memory
- database chat history
- thread/session id

### Streaming response

Hiện response trả một lần. Có thể thêm:

- SSE
- WebSocket

### Tool result schema

Có thể chuẩn hóa result bằng Pydantic model thay vì dict tự do.

### Observability

Có thể log:

- traceId
- selected intent
- selected tool
- tool latency
- LLM latency
- error rate

### Better readiness

Trong Docker Compose có thể thêm healthcheck để chat-service đợi work-service thật sự sẵn sàng.

## 27. Tóm Tắt Ngắn

Chat-service trong dự án này là một chatbot backend kiểu tool-using assistant:

```text
FastAPI endpoint
  -> JWT auth
  -> classify intent
  -> select whitelist tool
  -> call work-service with user token
  -> generate answer from tool_result
```

Điểm quan trọng nhất để học là: đừng để chatbot tự do truy cập database hoặc tự tạo truy vấn. Hãy cho nó một danh sách tool nhỏ, an toàn, có phân quyền, rồi để LLM chọn trong danh sách đó.
