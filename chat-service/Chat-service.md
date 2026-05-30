# Nexus Chat Service

`chat-service` là một microservice Python (FastAPI) dùng để xây dựng chatbot AI cho Nexus. Phiên bản hiện tại là V1, chỉ tập trung trả lời các câu hỏi liên quan tới `plan` và `task` của người dùng đang đăng nhập.

V1 chưa hỗ trợ RAG tài liệu, Qdrant, Cloudflare R2, upload file hay semantic search. Những tính năng này sẽ mở rộng sau khi hệ thống có dịch vụ upload/document.

## 1. Mục tiêu của service

Service này giải quyết bài toán:

```text
User hỏi bằng tiếng Việt tự nhiên
  -> AI hiểu user muốn hỏi gì
  -> AI chọn tool phù hợp
  -> Backend query MySQL bằng SQL an toàn
  -> AI diễn giải kết quả thành câu trả lời dễ hiểu
```

Ví dụ:

```text
"Task nào của tôi đang quá hạn?"
"Tôi có bao nhiêu task theo từng trạng thái?"
"Cho tôi xem các plan đang active"
"Tìm task có chữ API"
```

Điểm quan trọng: AI không được tự viết SQL. AI chỉ chọn tool và truyền tham số dưới dạng JSON. SQL thực sự được viết và kiểm soát ở phía backend.

## 2. Kiến trúc tổng quan

```text
Client
  |
  | POST /api/chatbot/message
  | Authorization: Bearer <JWT>
  v
api-gateway
  |
  | StripPrefix=2
  v
chat-service -> /message
  |
  | verify JWT -> lấy userId từ sub
  v
LangGraph Orchestrator
  |
  | classify_intent
  | select_tool
  | execute_tool
  | generate_answer
  v
SQL Tool Registry
  |
  v
WorkDb -> nexus_work_db
```

Public API qua Gateway:

```text
POST http://localhost:8080/api/chatbot/message
```

Internal API của chat-service:

```text
POST http://localhost:8090/message
GET  http://localhost:8090/health
```

## 3. Cấu trúc thư mục

```text
chat-service/
  api_server.py
  Dockerfile
  requirements.txt
  .env.example
  README.md

  core/
    config.py
    security.py
    llm_client.py

  agents/
    orchestrator_graph.py
    tool_registry.py

  db/
    work_db.py

  prompts/
    system_prompt.py

  tools/
    plan_tools.py
    task_tools.py
```

Ý nghĩa từng phần:

- `api_server.py`: điểm vào (entrypoint) FastAPI, định nghĩa `/health` và `/message`.
- `core/config.py`: đọc biến môi trường bằng `pydantic-settings`.
- `core/security.py`: xác thực JWT và lấy `currentUserId`.
- `core/llm_client.py`: wrapper gọi nhà cung cấp LLM.
- `agents/orchestrator_graph.py`: điều phối chính bằng LangGraph.
- `agents/tool_registry.py`: danh sách các tool mà AI được phép gọi.
- `db/work_db.py`: thực hiện truy vấn MySQL bằng SQL đã được parameterized.
- `prompts/system_prompt.py`: system prompt / persona / quy tắc trả lời.
- `tools/plan_tools.py`, `tools/task_tools.py`: module placeholder để tách các tool khi service mở rộng.

## 4. API server hoạt động thế nào

File chính: `api_server.py`.

Khi service khởi động, nó tạo các đối tượng singleton:

```python
settings = get_settings()
work_db = WorkDb()
tool_registry = ToolRegistry(work_db)
llm_client = LlmClient()
orchestrator = OrchestratorGraph(tool_registry, llm_client)
```

Ý nghĩa:

- `WorkDb`: chịu trách nhiệm kết nối MySQL.
- `ToolRegistry`: chứa danh sách tool hợp lệ.
- `LlmClient`: gọi LLM nếu có `LLM_API_KEY`.
- `OrchestratorGraph`: điều phối toàn bộ luồng chat.

Endpoint health:

```text
GET /health
```

Response ví dụ:

```json
{
  "status": "UP",
  "database": "UP",
  "llmConfigured": true
}
```

Endpoint chat:

```text
POST /message
Authorization: Bearer <token>
```

Request:

```json
{
  "message": "Task nao cua toi dang qua han?",
  "context": {}
}
```

Response:

```json
{
  "reply": "Mình tìm thấy 2 kết quả phù hợp...",
  "selectedAgent": "sql_tool",
  "traceId": "uuid",
  "tool": "get_overdue_tasks"
}
```

`traceId` dùng để debug/log theo từng request.

## 5. Gateway route

Gateway route nằm trong `api-gateway/src/main/resources/application.yaml`:

```yaml
- id: chat-service
  uri: http://localhost:8090
  predicates:
    - Path=/api/chatbot/**
  filters:
    - StripPrefix=2
```

Vì dùng `StripPrefix=2`:

```text
/api/chatbot/message -> /message
```

Nghĩa là client gọi qua Gateway:

```text
POST /api/chatbot/message
```

Nhưng `chat-service` nhận:

```text
POST /message
```

## 6. JWT security

File chính: `core/security.py`.

Chat service không tin `userId` do người dùng gửi trong body. Nó chỉ lấy user hiện tại từ JWT:

```text
Authorization: Bearer <JWT>
```

JWT được verify bằng:

```env
JWT_SIGNER_KEY=...
```

Thuật toán hiện tại:

```text
HS512
```

Sau khi verify token, service lấy:

```text
userId = payload["sub"]
```

Đây là cùng logic với Java service hiện tại: identity-service ký JWT với subject là `userId`.

Nếu thiếu token, token sai, hoặc token không có `sub`, API trả `401`.

## 7. Vì sao không dùng raw text-to-SQL

Raw text-to-SQL nghĩa là để AI tự sinh SQL như:

```sql
SELECT * FROM task WHERE status = 'TODO';
```

V1 không dùng cách này vì rủi ro:

- AI có thể query sai bảng/cột.
- AI có thể truy vấn dữ liệu người khác.
- AI có thể tạo query nặng.
- AI có thể sinh SQL nguy hiểm nếu guard chưa đủ tốt.
- Khó test và khó đảm bảo phân quyền.

Thay vào đó, V1 dùng:

```text
SQL tools cố định + query template động có kiểm soát
```

AI chỉ được chọn tool:

```json
{
  "tool": "search_my_tasks",
  "arguments": {
    "keyword": "API",
    "status": "IN_PROGRESS",
    "limit": 10
  }
}
```

Backend tự build SQL an toàn bằng parameterized query.

## 8. SQL tools cố định

Tool registry nằm trong `agents/tool_registry.py`.

Danh sách tool hiện tại:

```text
get_my_plans
get_plan_detail
get_tasks_by_plan
get_overdue_tasks
get_today_tasks
get_upcoming_tasks
get_task_count_by_status
search_my_tasks
search_my_plans
summarize_my_work
```

Mỗi tool có 4 phần:

```python
ToolSpec(
    name="get_overdue_tasks",
    description="Lấy task quá hạn của người dùng hiện tại.",
    parameters={"limit": "int optional"},
    handler=lambda user_id, args: ...
)
```

Ý nghĩa:

- `name`: tên tool AI được phép chọn.
- `description`: mô tả để LLM hiểu tool dùng khi nào.
- `parameters`: whitelist tham số.
- `handler`: hàm sẽ được gọi ở backend.

AI không gọi DB trực tiếp. AI chỉ gọi tool thông qua `ToolRegistry.execute(...)`.

## 9. Query template động có kiểm soát

Đây là phần giúp chatbot linh hoạt hơn trong khi vẫn an toàn hơn so với text-to-SQL.

Ví dụ tool:

```text
search_my_tasks(
  status?,
  keyword?,
  planId?,
  dueBefore?,
  dueAfter?,
  startBefore?,
  startAfter?,
  limit?
)
```

User hỏi:

```text
"Tìm task có chữ API, chưa xong, hạn trước thứ sáu"
```

LLM chọn:

```json
{
  "tool": "search_my_tasks",
  "arguments": {
    "keyword": "API",
    "status": "IN_PROGRESS",
    "dueBefore": "2026-05-29",
    "limit": 10
  }
}
```

Backend build SQL từ các filter hợp lệ. Nếu LLM truyền field lạ, field đó sẽ không được dùng vì handler chỉ đọc các key đã whitelist.

Tool plan tương tự:

```text
search_my_plans(
  status?,
  keyword?,
  limit?
)
```

Tool summary:

```text
summarize_my_work(
  fromDate?,
  toDate?,
  groupBy?
)
```

`groupBy` hiện hỗ trợ:

```text
status
plan
dueDate
```

## 10. DB layer và phân quyền dữ liệu

File chính: `db/work_db.py`.

Service đọc trực tiếp database:

```env
WORK_DB_URL=mysql+pymysql://root:123123@localhost:3308/nexus_work_db
```

Trong Docker Compose:

```env
WORK_DB_URL=mysql+pymysql://root:123123@work-mysql:3306/nexus_work_db
```

Hai bảng chính:

```text
plan
task
```

Quan hệ:

```text
plan.id = task.plan_id
plan.owner_user_id = current user id
```

Mỗi truy vấn task luôn join qua `plan`:

```sql
FROM task t
JOIN `plan` p ON p.id = t.plan_id
WHERE p.owner_user_id = :user_id
```

Điều này đảm bảo user chỉ thấy task thuộc plan của chính họ.

Ví dụ trong `search_my_tasks`, điều kiện đầu tiên luôn là:

```python
conditions = ["p.owner_user_id = :user_id"]
```

Sau đó mới cộng thêm filter:

```python
if status:
    conditions.append("LOWER(t.status) = LOWER(:status)")
if keyword:
    conditions.append(...)
```

SQL được chạy bằng parameterized query:

```python
conn.execute(sql, params)
```

Không nối trực tiếp input user vào giá trị SQL. Phần tạo điều kiện SQL chỉ được sinh từ whitelist trong code backend.

Limit được enforce:

```python
def _limit(self, limit):
    if limit is None:
        return self.default_limit
    return max(1, min(int(limit), self.max_limit))
```

Mặc định:

```text
SQL_DEFAULT_LIMIT=10
SQL_MAX_LIMIT=50
```

## 11. LangGraph orchestration

File chính: `agents/orchestrator_graph.py`.

LangGraph dùng để biến chatbot thành một luồng (flow) có state rõ ràng.

State hiện tại:

```python
class ChatState(TypedDict, total=False):
    user_id: str
    message: str
    intent: str
    selected_tool: str | None
    tool_arguments: dict[str, Any]
    tool_result: Any
    reply: str
    selected_agent: str
    error: str | None
```

Graph hiện tại:

```text
START
  -> classify_intent
  -> select_tool
  -> execute_tool
  -> generate_answer
END
```

### 11.1 classify_intent

Mục tiêu: hiểu câu hỏi thuộc loại nào.

Intent hợp lệ:

```text
plan_query
task_query
work_summary
unsupported
clarification_needed
```

Nếu có LLM API key, service sẽ gọi LLM để phân loại intent.

Nếu không có LLM API key, service dùng heuristic fallback:

```python
if "plan" in message:
    return "plan_query"
if "task" in message:
    return "task_query"
```

Fallback giúp test service local ngay cả khi chưa cấu hình API key.

### 11.2 select_tool

Mục tiêu: chọn đúng tool và arguments.

LLM nhận:

- system prompt,
- danh sách tool,
- intent,
- câu hỏi user,
- ngày hiện tại.

LLM phải trả JSON:

```json
{
  "tool": "get_overdue_tasks",
  "arguments": {
    "limit": 10
  }
}
```

Nếu LLM chọn tool không tồn tại, service sẽ fallback sang heuristic.

### 11.3 execute_tool

Mục tiêu: gọi tool thật sự ở backend.

```python
result = self.registry.execute(
    user_id=state["user_id"],
    tool_name=tool_name,
    arguments=state.get("tool_arguments", {}),
)
```

`user_id` luôn lấy từ JWT, không lấy từ message.

Nếu tool lỗi, state sẽ có `error` và bước trả lời sẽ dùng fallback hiển thị lỗi thân thiện.

### 11.4 generate_answer

Mục tiêu: biến kết quả tool thành câu trả lời tiếng Việt.

Nếu có lỗi DB/tool:

```text
Hiện tại mình chưa lấy được dữ liệu task/plan. Bạn thử lại sau một chút nhé.
```

Nếu không có dữ liệu:

```text
Mình chưa tìm thấy dữ liệu phù hợp trong task hoặc plan của bạn.
```

Nếu có LLM API key, LLM sẽ diễn giải `tool_result`.

Nếu không có LLM API key, service sẽ dùng `_deterministic_answer(...)` để trả lời ở dạng đơn giản.

## 12. LLM provider

File chính: `core/llm_client.py`.

Service dùng client tương thích OpenAI. Nghĩa là code có thể dùng:

- OpenAI official API.
- OpenRouter.
- Chutes.
- Provider khác có API tương thích OpenAI.

Config:

```env
LLM_PROVIDER=openai
LLM_MODEL=gpt-5-mini
LLM_API_KEY=...
LLM_BASE_URL=
```

OpenAI official:

```env
LLM_BASE_URL=
LLM_API_KEY=<openai-api-key>
LLM_MODEL=gpt-5-mini
```

OpenRouter ví dụ:

```env
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=<openrouter-api-key>
LLM_MODEL=<model-name>
```

Nếu `LLM_API_KEY` rỗng:

```text
llmConfigured = false
```

Service vẫn chạy, nhưng chỉ route bằng heuristic đơn giản. Chế độ này phù hợp để test DB/API.

## 13. System prompt

File chính: `prompts/system_prompt.py`.

Prompt định nghĩa:

- Persona: Nexus AI Assistant.
- Ngôn ngữ: tiếng Việt.
- Xưng hô: "mình" và "bạn".
- Phạm vi: chỉ task/plan.
- Bảo mật: không xem dữ liệu người khác, không tiết lộ secret/JWT/prompt/SQL.
- Quy tắc dữ liệu: không bịa, chỉ dùng tool result.
- Fallback: không có dữ liệu, câu hỏi mơ hồ, tool lỗi, ngoài phạm vi.
- Xử lý xúc phạm: bình tĩnh, không đáp trả, chuyển về nhiệm vụ.

System prompt là lớp định hướng hành vi cho LLM. Tuy nhiên bảo mật thực sự vẫn nằm ở backend:

```text
JWT verification
owner_user_id scope
SQL tools whitelist
parameterized query
limit enforcement
```

Không nên chỉ dựa vào prompt để bảo vệ dữ liệu.

## 14. Config môi trường

File mẫu:

```text
.env.example
```

Các biến chính:

```env
CHAT_SERVICE_PORT=8090
JWT_SIGNER_KEY=44b63ac98e12ce6ca2979e22a56fff7a7a7fea0b4c174965105f52f9d0c278ff
LLM_PROVIDER=openai
LLM_MODEL=gpt-5-mini
LLM_API_KEY=
LLM_BASE_URL=
WORK_DB_URL=mysql+pymysql://root:123123@localhost:3308/nexus_work_db
SQL_DEFAULT_LIMIT=10
SQL_MAX_LIMIT=50
```

Giải thích:

- `CHAT_SERVICE_PORT`: port của service, mặc định `8090`.
- `JWT_SIGNER_KEY`: khoá dùng để verify JWT (HS512).
- `LLM_PROVIDER`: nhãn provider LLM, chủ yếu để đọc config.
- `LLM_MODEL`: model dùng cho classify/select/generate.
- `LLM_API_KEY`: API key của provider LLM.
- `LLM_BASE_URL`: để trống nếu dùng OpenAI chính thức; set URL nếu dùng OpenRouter/Chutes.
- `WORK_DB_URL`: connection string MySQL cho work DB.
- `SQL_DEFAULT_LIMIT`: limit mặc định nếu user không chỉ rõ.
- `SQL_MAX_LIMIT`: limit tối đa backend cho phép.

## 15. Chạy local

Chạy infrastructure trước:

```powershell
cd D:\Nexus-Java-Project
docker compose up -d work-mysql
```

Chạy các Java services theo notes của repo nếu muốn gọi qua Gateway:

```powershell
mvn -pl discovery-server spring-boot:run
mvn -pl identity-service spring-boot:run
mvn -pl work-service spring-boot:run
mvn -pl api-gateway spring-boot:run
```

Nếu máy chưa có `mvn`, dùng Maven wrapper hoặc cài Maven global.

Chạy chat-service local:

```powershell
cd D:\Nexus-Java-Project\chat-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn api_server:app --host 0.0.0.0 --port 8090
```

Health check:

```powershell
curl http://localhost:8090/health
```

Gọi trực tiếp chat-service:

```powershell
curl -X POST http://localhost:8090/message `
  -H "Authorization: Bearer <token>" `
  -H "Content-Type: application/json" `
  -d "{\"message\":\"Task nao cua toi dang qua han?\",\"context\":{}}"
```

Gọi qua Gateway:

```powershell
curl -X POST http://localhost:8080/api/chatbot/message `
  -H "Authorization: Bearer <token>" `
  -H "Content-Type: application/json" `
  -d "{\"message\":\"Task nao cua toi dang qua han?\",\"context\":{}}"
```

## 16. Chạy bằng Docker Compose

`docker-compose.yml` đã có:

```yaml
chat-service:
  build:
    context: ./chat-service
  ports:
    - "8090:8090"
  environment:
    WORK_DB_URL: mysql+pymysql://root:123123@work-mysql:3306/nexus_work_db
```

Build và chạy:

```powershell
docker compose up -d work-mysql chat-service
```

Nếu muốn bật LLM:

```powershell
$env:LLM_API_KEY="..."
docker compose up -d --build chat-service
```

## 17. Ví dụ câu hỏi và tool tương ứng

```text
"Tôi có những plan nào?"
-> search_my_plans hoặc get_my_plans
```

```text
"Task nào của tôi đang quá hạn?"
-> get_overdue_tasks
```

```text
"Hôm nay tôi có task nào?"
-> get_today_tasks
```

```text
"Tuần này có task nào sắp tới?"
-> get_upcoming_tasks
```

```text
"Tìm task có chữ API"
-> search_my_tasks(keyword="API")
```

```text
"Thống kê task theo trạng thái"
-> get_task_count_by_status hoặc summarize_my_work(groupBy="status")
```

```text
"Tóm tắt công việc theo plan"
-> summarize_my_work(groupBy="plan")
```

## 18. Những gì V1 chưa làm

V1 chưa hỗ trợ:

- Tạo/sửa/xóa task hoặc plan bằng chatbot.
- RAG tài liệu.
- Upload file.
- Qdrant.
- Cloudflare R2.
- Text-to-SQL tự do.
- Query identity DB.
- Streaming response.
- Conversation memory nhiều lượt.

Nếu user hỏi ngoài phạm vi, chatbot trả:

```text
Mình hiện chỉ hỗ trợ các câu hỏi liên quan đến task và plan trong Nexus.
```

## 19. Cách mở rộng sau này

### Thêm tool mới

Ví dụ muốn hỗ trợ:

```text
"Task nào vừa hoàn thành trong tháng này?"
```

Làm 2 bước:

1. Thêm method trong `WorkDb`, ví dụ:

```python
def get_completed_tasks(self, user_id: str, from_date: str, to_date: str):
    ...
```

2. Đăng ký tool trong `ToolRegistry`:

```python
"get_completed_tasks": ToolSpec(...)
```

Không cần sửa API endpoint.

### Thêm RAG sau này

Khi có upload/document service, có thể thêm:

```text
Qdrant
Cloudflare R2
document metadata DB
indexing worker
```

LangGraph lúc đó mở rộng thành:

```text
START
  -> classify_intent
  -> retrieve_knowledge
  -> grade_context
  -> answer_from_rag | select_tool
  -> execute_tool
  -> generate_answer
END
```

Vì hiện tại đã dùng LangGraph, sau này thêm node RAG sẽ dễ hơn so với viết một hàm `if/else` lớn.

### Thêm conversation memory

Hiện tại mỗi request độc lập. Sau này có thể thêm:

```text
conversation_id
chat_messages table
short-term memory trong Redis
```

Khi đó request có thể là:

```json
{
  "conversationId": "abc",
  "message": "Con task nao nua khong?",
  "context": {}
}
```

## 20. Nguyên tắc thiết kế cần nhớ

Các quyết định quan trọng của service này:

- AI hiểu ý định, nhưng backend kiểm soát dữ liệu.
- Không cho AI tự viết SQL ở V1.
- Phạm vi người dùng luôn lấy từ JWT.
- Mỗi truy vấn task đều enforce `plan.owner_user_id = currentUserId`.
- Truy vấn dùng parameterized SQL.
- Limit luôn được clamp trong backend.
- Prompt giúp định hướng hành vi, nhưng không thay thế bảo mật backend.
- LangGraph giúp flow rõ ràng và dễ mở rộng.

Tóm lại, `chat-service` V1 là nền tảng an toàn cho chatbot AI trong Nexus: đủ để hỏi đáp về task/plan, có thể test local mà không cần LLM key, và dễ mở rộng về sau để thêm RAG/document chat.
# Nexus Chat Service

`chat-service` la microservice Python FastAPI dung de xay AI chatbot cho Nexus. Phien ban hien tai la V1, chi tap trung tra loi cau hoi ve `plan` va `task` cua nguoi dung dang dang nhap.

V1 chua lam RAG tai lieu, Qdrant, Cloudflare R2, upload file hoac semantic search. Cac phan do se mo rong sau khi he thong co upload/document service.

## 1. Muc tieu cua service

Service nay giai quyet bai toan:

```text
User hoi bang tieng Viet tu nhien
  -> AI hieu user muon hoi gi
  -> AI chon tool phu hop
  -> Backend query MySQL bang SQL an toan
  -> AI dien giai ket qua thanh cau tra loi de hieu
```

Vi du:

```text
"Task nao cua toi dang qua han?"
"Toi co bao nhieu task theo tung trang thai?"
"Cho toi xem cac plan dang active"
"Tim task co chu API"
```

Diem quan trong: AI khong duoc tu viet SQL. AI chi chon tool va truyen tham so JSON. SQL that duoc viet trong backend.

## 2. Kien truc tong quan

```text
Client
  |
  | POST /api/chatbot/message
  | Authorization: Bearer <JWT>
  v
api-gateway
  |
  | StripPrefix=2
  v
chat-service /message
  |
  | verify JWT -> lay userId tu sub
  v
LangGraph Orchestrator
  |
  | classify_intent
  | select_tool
  | execute_tool
  | generate_answer
  v
SQL Tool Registry
  |
  v
WorkDb -> nexus_work_db
```

Public API qua Gateway:

```text
POST http://localhost:8080/api/chatbot/message
```

Internal API cua chat-service:

```text
POST http://localhost:8090/message
GET  http://localhost:8090/health
```

## 3. Cau truc thu muc

```text
chat-service/
  api_server.py
  Dockerfile
  requirements.txt
  .env.example
  README.md

  core/
    config.py
    security.py
    llm_client.py

  agents/
    orchestrator_graph.py
    tool_registry.py

  db/
    work_db.py

  prompts/
    system_prompt.py

  tools/
    plan_tools.py
    task_tools.py
```

Y nghia tung phan:

- `api_server.py`: entrypoint FastAPI, dinh nghia `/health` va `/message`.
- `core/config.py`: doc bien moi truong bang `pydantic-settings`.
- `core/security.py`: verify JWT va lay `currentUserId`.
- `core/llm_client.py`: wrapper goi LLM provider.
- `agents/orchestrator_graph.py`: flow LangGraph chinh.
- `agents/tool_registry.py`: danh sach tool ma AI duoc phep goi.
- `db/work_db.py`: query MySQL bang SQL parameterized.
- `prompts/system_prompt.py`: system prompt/persona/quy tac tra loi.
- `tools/plan_tools.py`, `tools/task_tools.py`: module placeholder de tach tool sau nay neu service lon hon.

## 4. API server hoat dong the nao

File chinh: `api_server.py`.

Khi service start, no tao cac object singleton:

```python
settings = get_settings()
work_db = WorkDb()
tool_registry = ToolRegistry(work_db)
llm_client = LlmClient()
orchestrator = OrchestratorGraph(tool_registry, llm_client)
```

Y nghia:

- `WorkDb`: chiu trach nhiem ket noi MySQL.
- `ToolRegistry`: chua danh sach tool hop le.
- `LlmClient`: goi LLM neu co `LLM_API_KEY`.
- `OrchestratorGraph`: dieu phoi toan bo luong chat.

Endpoint health:

```text
GET /health
```

Response vi du:

```json
{
  "status": "UP",
  "database": "UP",
  "llmConfigured": true
}
```

Endpoint chat:

```text
POST /message
Authorization: Bearer <token>
```

Request:

```json
{
  "message": "Task nao cua toi dang qua han?",
  "context": {}
}
```

Response:

```json
{
  "reply": "Minh tim thay 2 ket qua phu hop...",
  "selectedAgent": "sql_tool",
  "traceId": "uuid",
  "tool": "get_overdue_tasks"
}
```

`traceId` dung de debug/log theo tung request.

## 5. Gateway route

Gateway route nam trong `api-gateway/src/main/resources/application.yaml`:

```yaml
- id: chat-service
  uri: http://localhost:8090
  predicates:
    - Path=/api/chatbot/**
  filters:
    - StripPrefix=2
```

Vi dung `StripPrefix=2`:

```text
/api/chatbot/message -> /message
```

Nghia la client goi qua Gateway:

```text
POST /api/chatbot/message
```

Nhung `chat-service` nhan:

```text
POST /message
```

## 6. JWT security

File chinh: `core/security.py`.

Chat service khong tin `userId` do nguoi dung gui trong body. No chi lay user hien tai tu JWT:

```text
Authorization: Bearer <JWT>
```

JWT duoc verify bang:

```env
JWT_SIGNER_KEY=...
```

Thuat toan hien tai:

```text
HS512
```

Sau khi verify token, service lay:

```text
userId = payload["sub"]
```

Day la cung logic voi Java service hien tai: identity-service ky JWT voi subject la `userId`.

Neu thieu token, token sai, hoac token khong co `sub`, API tra `401`.

## 7. Vi sao khong dung raw text-to-SQL

Raw text-to-SQL nghia la de AI tu sinh SQL nhu:

```sql
SELECT * FROM task WHERE status = 'TODO';
```

V1 khong dung cach nay vi rui ro:

- AI co the query sai bang/cot.
- AI co the query du lieu nguoi khac.
- AI co the tao query nang.
- AI co the sinh SQL nguy hiem neu guard chua du tot.
- Kho test va kho dam bao phan quyen.

Thay vao do, V1 dung:

```text
SQL tools co dinh + query template dong co kiem soat
```

AI chi duoc chon tool:

```json
{
  "tool": "search_my_tasks",
  "arguments": {
    "keyword": "API",
    "status": "IN_PROGRESS",
    "limit": 10
  }
}
```

Backend tu build SQL an toan bang parameterized query.

## 8. SQL tools co dinh

Tool registry nam trong `agents/tool_registry.py`.

Danh sach tool hien tai:

```text
get_my_plans
get_plan_detail
get_tasks_by_plan
get_overdue_tasks
get_today_tasks
get_upcoming_tasks
get_task_count_by_status
search_my_tasks
search_my_plans
summarize_my_work
```

Moi tool co 4 phan:

```python
ToolSpec(
    name="get_overdue_tasks",
    description="Lay task qua han cua nguoi dung hien tai.",
    parameters={"limit": "int optional"},
    handler=lambda user_id, args: ...
)
```

Y nghia:

- `name`: ten tool AI duoc phep chon.
- `description`: mo ta de LLM hieu tool dung khi nao.
- `parameters`: whitelist tham so.
- `handler`: function that duoc goi trong backend.

AI khong goi DB truc tiep. AI chi goi tool thong qua `ToolRegistry.execute(...)`.

## 9. Query template dong co kiem soat

Day la phan giup chatbot linh hoat hon tool co dinh nhung van an toan hon text-to-SQL.

Vi du tool:

```text
search_my_tasks(
  status?,
  keyword?,
  planId?,
  dueBefore?,
  dueAfter?,
  startBefore?,
  startAfter?,
  limit?
)
```

User hoi:

```text
"Tim task co chu API, chua xong, han truoc thu sau"
```

LLM chon:

```json
{
  "tool": "search_my_tasks",
  "arguments": {
    "keyword": "API",
    "status": "IN_PROGRESS",
    "dueBefore": "2026-05-29",
    "limit": 10
  }
}
```

Backend build SQL tu cac filter hop le. Neu LLM truyen field la, field do khong duoc dung vi handler chi doc cac key da whitelist.

Tool plan dong:

```text
search_my_plans(
  status?,
  keyword?,
  limit?
)
```

Tool summary:

```text
summarize_my_work(
  fromDate?,
  toDate?,
  groupBy?
)
```

`groupBy` hien ho tro:

```text
status
plan
dueDate
```

## 10. DB layer va phan quyen du lieu

File chinh: `db/work_db.py`.

Service doc truc tiep database:

```env
WORK_DB_URL=mysql+pymysql://root:123123@localhost:3308/nexus_work_db
```

Trong Docker Compose:

```env
WORK_DB_URL=mysql+pymysql://root:123123@work-mysql:3306/nexus_work_db
```

Hai bang chinh:

```text
plan
task
```

Quan he:

```text
plan.id = task.plan_id
plan.owner_user_id = current user id
```

Moi query task deu join qua `plan`:

```sql
FROM task t
JOIN `plan` p ON p.id = t.plan_id
WHERE p.owner_user_id = :user_id
```

Dieu nay dam bao user chi thay task nam trong plan cua chinh ho.

Vi du trong `search_my_tasks`, condition dau tien luon la:

```python
conditions = ["p.owner_user_id = :user_id"]
```

Sau do moi cong them filter:

```python
if status:
    conditions.append("LOWER(t.status) = LOWER(:status)")
if keyword:
    conditions.append(...)
```

SQL duoc chay bang parameterized query:

```python
conn.execute(sql, params)
```

Khong noi truc tiep input user vao SQL value. Rieng phan condition SQL chi duoc tao tu code whitelist trong backend.

Limit duoc enforce:

```python
def _limit(self, limit):
    if limit is None:
        return self.default_limit
    return max(1, min(int(limit), self.max_limit))
```

Mac dinh:

```text
SQL_DEFAULT_LIMIT=10
SQL_MAX_LIMIT=50
```

## 11. LangGraph orchestration

File chinh: `agents/orchestrator_graph.py`.

LangGraph dung de bien chatbot thanh flow co state ro rang.

State hien tai:

```python
class ChatState(TypedDict, total=False):
    user_id: str
    message: str
    intent: str
    selected_tool: str | None
    tool_arguments: dict[str, Any]
    tool_result: Any
    reply: str
    selected_agent: str
    error: str | None
```

Graph hien tai:

```text
START
  -> classify_intent
  -> select_tool
  -> execute_tool
  -> generate_answer
END
```

### 11.1 classify_intent

Muc tieu: hieu cau hoi thuoc loai nao.

Intent hop le:

```text
plan_query
task_query
work_summary
unsupported
clarification_needed
```

Neu co LLM API key, service hoi LLM phan loai intent.

Neu khong co LLM API key, service dung heuristic fallback:

```python
if "plan" in message:
    return "plan_query"
if "task" in message:
    return "task_query"
```

Fallback giup ban test service local ngay ca khi chua cau hinh API key.

### 11.2 select_tool

Muc tieu: chon dung tool va arguments.

LLM nhan:

- system prompt,
- danh sach tool,
- intent,
- cau hoi user,
- ngay hien tai.

LLM phai tra JSON:

```json
{
  "tool": "get_overdue_tasks",
  "arguments": {
    "limit": 10
  }
}
```

Neu LLM chon tool khong ton tai, service fallback sang heuristic.

### 11.3 execute_tool

Muc tieu: goi tool that trong backend.

```python
result = self.registry.execute(
    user_id=state["user_id"],
    tool_name=tool_name,
    arguments=state.get("tool_arguments", {}),
)
```

`user_id` luon lay tu JWT, khong lay tu message.

Neu tool loi, state se co `error` va buoc tra loi se dung fallback loi than thien.

### 11.4 generate_answer

Muc tieu: bien ket qua tool thanh cau tra loi tieng Viet.

Neu co loi DB/tool:

```text
Hien tai minh chua lay duoc du lieu task/plan. Ban thu lai sau mot chut nhe.
```

Neu khong co du lieu:

```text
Minh chua tim thay du lieu phu hop trong task hoac plan cua ban.
```

Neu co LLM API key, LLM dien giai `tool_result`.

Neu khong co LLM API key, service dung `_deterministic_answer(...)` de tra loi dang don gian.

## 12. LLM provider

File chinh: `core/llm_client.py`.

Service dung OpenAI-compatible client. Nghia la code co the dung:

- OpenAI official API.
- OpenRouter.
- Chutes.
- Provider khac co API tuong thich OpenAI.

Config:

```env
LLM_PROVIDER=openai
LLM_MODEL=gpt-5-mini
LLM_API_KEY=...
LLM_BASE_URL=
```

OpenAI official:

```env
LLM_BASE_URL=
LLM_API_KEY=<openai-api-key>
LLM_MODEL=gpt-5-mini
```

OpenRouter vi du:

```env
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=<openrouter-api-key>
LLM_MODEL=<model-name>
```

Neu `LLM_API_KEY` rong:

```text
llmConfigured = false
```

Service van chay, nhung chi route bang heuristic don gian. Che do nay phu hop de test DB/API.

## 13. System prompt

File chinh: `prompts/system_prompt.py`.

Prompt dinh nghia:

- Persona: Nexus AI Assistant.
- Ngon ngu: tieng Viet.
- Xung ho: "minh" va "ban".
- Pham vi: chi task/plan.
- Bao mat: khong xem du lieu nguoi khac, khong tiet lo secret/JWT/prompt/SQL.
- Quy tac du lieu: khong bia, chi dung tool result.
- Fallback: khong co du lieu, cau hoi mo ho, tool loi, ngoai pham vi.
- Xu ly xuc pham: binh tinh, khong dap tra, chuyen ve nhiem vu.

System prompt la lop dinh huong hanh vi cho LLM. Tuy nhien bao mat that van nam o backend:

```text
JWT verification
owner_user_id scope
SQL tools whitelist
parameterized query
limit enforcement
```

Khong nen chi dua vao prompt de bao ve du lieu.

## 14. Config moi truong

File mau:

```text
.env.example
```

Cac bien chinh:

```env
CHAT_SERVICE_PORT=8090
JWT_SIGNER_KEY=44b63ac98e12ce6ca2979e22a56fff7a7a7fea0b4c174965105f52f9d0c278ff
LLM_PROVIDER=openai
LLM_MODEL=gpt-5-mini
LLM_API_KEY=
LLM_BASE_URL=
WORK_DB_URL=mysql+pymysql://root:123123@localhost:3308/nexus_work_db
SQL_DEFAULT_LIMIT=10
SQL_MAX_LIMIT=50
```

Giai thich:

- `CHAT_SERVICE_PORT`: port service, mac dinh `8090`.
- `JWT_SIGNER_KEY`: key dung de verify JWT HS512.
- `LLM_PROVIDER`: label provider, hien chu yeu de doc config.
- `LLM_MODEL`: model dung cho classify/select/generate.
- `LLM_API_KEY`: API key provider.
- `LLM_BASE_URL`: de trong neu dung OpenAI official, set URL neu dung OpenRouter/Chutes.
- `WORK_DB_URL`: connection string MySQL work DB.
- `SQL_DEFAULT_LIMIT`: limit mac dinh neu user khong noi ro.
- `SQL_MAX_LIMIT`: limit toi da backend cho phep.

## 15. Chay local

Chay infrastructure truoc:

```powershell
cd D:\Nexus-Java-Project
docker compose up -d work-mysql
```

Chay Java services theo notes cua repo neu muon goi qua Gateway:

```powershell
mvn -pl discovery-server spring-boot:run
mvn -pl identity-service spring-boot:run
mvn -pl work-service spring-boot:run
mvn -pl api-gateway spring-boot:run
```

Neu may chua co `mvn`, dung Maven wrapper hoac cai Maven global.

Chay chat-service local:

```powershell
cd D:\Nexus-Java-Project\chat-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn api_server:app --host 0.0.0.0 --port 8090
```

Health check:

```powershell
curl http://localhost:8090/health
```

Goi truc tiep chat-service:

```powershell
curl -X POST http://localhost:8090/message `
  -H "Authorization: Bearer <token>" `
  -H "Content-Type: application/json" `
  -d "{\"message\":\"Task nao cua toi dang qua han?\",\"context\":{}}"
```

Goi qua Gateway:

```powershell
curl -X POST http://localhost:8080/api/chatbot/message `
  -H "Authorization: Bearer <token>" `
  -H "Content-Type: application/json" `
  -d "{\"message\":\"Task nao cua toi dang qua han?\",\"context\":{}}"
```

## 16. Chay bang Docker Compose

`docker-compose.yml` da co:

```yaml
chat-service:
  build:
    context: ./chat-service
  ports:
    - "8090:8090"
  environment:
    WORK_DB_URL: mysql+pymysql://root:123123@work-mysql:3306/nexus_work_db
```

Build va chay:

```powershell
docker compose up -d work-mysql chat-service
```

Neu muon bat LLM:

```powershell
$env:LLM_API_KEY="..."
docker compose up -d --build chat-service
```

## 17. Vi du cau hoi va tool tuong ung

```text
"Toi co nhung plan nao?"
-> search_my_plans hoac get_my_plans
```

```text
"Task nao cua toi dang qua han?"
-> get_overdue_tasks
```

```text
"Hom nay toi co task nao?"
-> get_today_tasks
```

```text
"Tuan nay co task nao sap toi?"
-> get_upcoming_tasks
```

```text
"Tim task co chu API"
-> search_my_tasks(keyword="API")
```

```text
"Thong ke task theo trang thai"
-> get_task_count_by_status hoac summarize_my_work(groupBy="status")
```

```text
"Tom tat cong viec theo plan"
-> summarize_my_work(groupBy="plan")
```

## 18. Nhung gi V1 chua lam

V1 chua ho tro:

- Tao/sua/xoa task hoac plan bang chatbot.
- RAG tai lieu.
- Upload file.
- Qdrant.
- Cloudflare R2.
- Text-to-SQL tu do.
- Query identity DB.
- Streaming response.
- Conversation memory nhieu luot.

Neu user hoi ngoai pham vi, chatbot tra:

```text
Minh hien chi ho tro cac cau hoi lien quan den task va plan trong Nexus.
```

## 19. Cach mo rong sau nay

### Them tool moi

Vi du muon ho tro:

```text
"Task nao vua hoan thanh trong thang nay?"
```

Lam 2 buoc:

1. Them method trong `WorkDb`, vi du:

```python
def get_completed_tasks(self, user_id: str, from_date: str, to_date: str):
    ...
```

2. Dang ky tool trong `ToolRegistry`:

```python
"get_completed_tasks": ToolSpec(...)
```

Khong can sua API endpoint.

### Them RAG sau nay

Khi co upload/document service, co the them:

```text
Qdrant
Cloudflare R2
document metadata DB
indexing worker
```

LangGraph luc do mo rong thanh:

```text
START
  -> classify_intent
  -> retrieve_knowledge
  -> grade_context
  -> answer_from_rag | select_tool
  -> execute_tool
  -> generate_answer
END
```

Vi hien tai da dung LangGraph, sau nay them node RAG se de hon so voi viet mot ham `if/else` lon.

### Them conversation memory

Hien tai moi request doc lap. Sau nay co the them:

```text
conversation_id
chat_messages table
short-term memory trong Redis
```

Khi do request co the la:

```json
{
  "conversationId": "abc",
  "message": "Con task nao nua khong?",
  "context": {}
}
```

## 20. Nguyen tac thiet ke can nho

Cac quyet dinh quan trong cua service nay:

- AI hieu y dinh, nhung backend kiem soat du lieu.
- Khong cho AI tu viet SQL o V1.
- User scope luon lay tu JWT.
- Moi query task deu enforce `plan.owner_user_id = currentUserId`.
- Query dung parameterized SQL.
- Limit luon duoc clamp.
- Prompt giup dinh huong hanh vi, nhung khong thay the security backend.
- LangGraph giup flow ro rang va de mo rong.

Tom lai, `chat-service` V1 la nen mong an toan cho AI chatbot trong Nexus: du de hoi dap task/plan, co the test local khong can LLM key, va co duong mo rong ro rang sang RAG/document chatbot sau nay.
