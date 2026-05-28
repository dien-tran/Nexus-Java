# Nexus Flow

Nexus Flow là nền tảng quản lý công việc, kế hoạch nội dung và trợ lý AI dành cho cá nhân hoặc nhóm làm việc cần một không gian tập trung để theo dõi nhiệm vụ, xây dựng kế hoạch, quản lý tiến độ và nhận gợi ý thông minh từ AI.

Dự án được xây dựng theo mô hình microservices với Java Spring Boot ở backend, React ở frontend, API Gateway, service discovery, xác thực JWT, MySQL, Redis, Kafka và một Chat Service riêng cho trải nghiệm trợ lý AI.

## Sản phẩm giải quyết vấn đề gì?

Trong một quy trình làm việc hiện đại, người dùng thường phải chia nhỏ công việc giữa nhiều công cụ: task board, lịch, ghi chú, kế hoạch dài hạn và chatbot AI. Nexus Flow gom các luồng đó vào một workspace thống nhất:

- Quản lý nhiệm vụ theo trạng thái, độ ưu tiên, deadline và người phụ trách.
- Theo dõi kế hoạch hoặc proposal từ lúc phác thảo đến hoàn tất.
- Quan sát tiến độ dài hạn bằng roadmap và milestone.
- Xem deadline trên lịch tuần/tháng.
- Trao đổi với AI Assistant để phân tích công việc, gợi ý bước tiếp theo hoặc hỗ trợ viết nội dung/code.
- Bảo vệ dữ liệu người dùng bằng đăng nhập, JWT và phân quyền theo user.

## Trải nghiệm người dùng

### Landing Page

Trang giới thiệu sản phẩm cho người dùng mới, trình bày định vị của Nexus Flow như một workspace tập trung cho công việc sáng tạo, nghiên cứu và quản lý nội dung. Người dùng có thể xem phần giới thiệu tính năng, demo AI Assistant và đi tới đăng nhập hoặc đăng ký.

### Authentication

Giao diện đăng nhập và đăng ký tài khoản. Backend `identity-service` hỗ trợ tạo user, mã hóa mật khẩu, đăng nhập bằng email/password và cấp JWT. API Gateway cho phép public các endpoint đăng nhập, xác thực token và tạo user, các endpoint nghiệp vụ còn lại yêu cầu JWT hợp lệ.

### Focus Dashboard

Dashboard là màn hình tổng quan sau khi đăng nhập:

- Daily Focus hiển thị các nhiệm vụ cần xử lý trong ngày.
- Upcoming Deadlines giúp người dùng nhìn nhanh các deadline sắp tới.
- Weekly Productivity mô phỏng biểu đồ năng suất theo tuần.
- AI Suggestion Panel đưa ra nhận định nhanh dựa trên danh sách task.
- Quick task cho phép tạo nhanh nhiệm vụ mới từ thanh điều hướng.

### Creative Workspace

Workspace là nơi quản lý các kế hoạch nội dung và mục tiêu dài hạn:

- Q4 Editorial Queue: tạo proposal/plan, cập nhật trạng thái Drafting, In Review, Completed.
- Roadmap Objectives: theo dõi mục tiêu dài hạn, phần trăm tiến độ và checklist milestone.
- View Details & Tasks: mở chi tiết từng plan/roadmap và xem các task liên quan.
- Update Details: chỉnh sửa thông tin kế hoạch hoặc mục tiêu.

### Task Boards

Task Boards là bảng Kanban cho công việc hằng ngày:

- Các cột trạng thái: To Do, In Progress, Review, Completed.
- Tạo task mới, cập nhật chi tiết, xóa task.
- Di chuyển task qua lại giữa các cột.
- Tìm kiếm theo tiêu đề hoặc mô tả.
- Lọc theo category.
- Pin/unpin task để ưu tiên hiển thị ở khu vực quan trọng.
- Hiển thị deadline, priority, assignee và mô tả ngắn.

### Calendar

Calendar giúp nhìn công việc theo thời gian:

- Chế độ Week và Month.
- Điều hướng tuần/tháng trước sau.
- Chọn nhanh tháng/năm.
- Hiển thị task một ngày hoặc task kéo dài nhiều ngày dựa trên `startDate` và `dueDate`.
- Màu sắc task thay đổi theo category để dễ nhận diện.

### AI Assistant

AI Assistant cung cấp giao diện chat toàn màn hình:

- Gửi câu hỏi hoặc yêu cầu phân tích công việc.
- Nhận phản hồi dạng hội thoại.
- Hiển thị code block đẹp nếu AI trả về đoạn code.
- Copy code trực tiếp từ UI.
- Reset lịch sử chat.

Frontend hiện có server Express/Vite hỗ trợ chế độ demo với dữ liệu in-memory và Gemini API. Backend cũng có `chat-service` FastAPI riêng, dùng LangGraph/OpenAI-compatible LLM để đọc dữ liệu work database và trả lời theo ngữ cảnh người dùng.

### Pinned / Atmosphere

Khu vực dành cho các nội dung được ghim hoặc không gian tập trung bổ trợ. Đây là phần giúp người dùng quay lại các mục ưu tiên hoặc tạo cảm giác workspace cá nhân hóa hơn.

## Kiến trúc hệ thống

```text
Frontend React
   |
   | HTTP /api/*
   v
API Gateway :8080
   |
   | route + JWT validation
   v
------------------------------------------------
| identity-service :8081 | work-service :8082 |
| discovery-server :8761 | chat-service :8090 |
------------------------------------------------
   |
   v
MySQL, Redis, Kafka
```

### Các module chính

| Module | Vai trò |
| --- | --- |
| `front-end` | Ứng dụng React/Vite, giao diện Nexus Flow, demo API bằng Express server |
| `api-gateway` | Cổng vào duy nhất cho backend Java, route `/api/*`, validate JWT |
| `discovery-server` | Eureka Server cho service discovery |
| `identity-service` | Đăng ký, đăng nhập, verify token, phát event tạo user qua Kafka |
| `work-service` | Quản lý plans, tasks, phân quyền dữ liệu theo user hiện tại, Redis cache |
| `common-lib` | DTO/event dùng chung giữa các service |
| `chat-service` | FastAPI service cho AI Assistant, kết nối LLM và work database |

## Luồng nghiệp vụ backend

### Đăng ký và đăng nhập

1. Người dùng tạo tài khoản qua `/api/users/create`.
2. `identity-service` lưu user vào MySQL và mã hóa mật khẩu.
3. Service phát Kafka event `identity.user.created.v1`.
4. `work-service` consume event để lưu user projection riêng, tránh đọc trực tiếp database của identity.
5. Người dùng đăng nhập qua `/api/auth/login`.
6. Backend trả về JWT, các request nghiệp vụ sau đó đi qua API Gateway và cần token hợp lệ.

### Quản lý kế hoạch và task

1. Người dùng tạo plan trong `work-service`.
2. Plan được gắn với `ownerUserId` lấy từ JWT subject.
3. Task được tạo trong một plan thuộc về user hiện tại.
4. Khi đọc/cập nhật/xóa dữ liệu, service kiểm tra quyền sở hữu để tránh user truy cập dữ liệu của user khác.
5. Redis cache được dùng cho danh sách plans, plan chi tiết và tasks để giảm truy vấn database.

### AI Assistant

Chat service nhận message từ người dùng, xác thực user từ JWT, chọn agent/tool phù hợp và có thể đọc dữ liệu work database để trả lời theo ngữ cảnh. Service có endpoint kiểm tra health và endpoint gửi message.

## API chính

### API Gateway

| Public path | Service đích | Mô tả |
| --- | --- | --- |
| `POST /api/auth/login` | `identity-service` | Đăng nhập |
| `POST /api/auth/verify` | `identity-service` | Kiểm tra token |
| `POST /api/users/create` | `identity-service` | Tạo tài khoản |
| `/api/plans/**` | `work-service` | Quản lý plans |
| `/api/tasks/**` | `work-service` | Quản lý tasks |
| `/api/chatbot/**` | `chat-service` | Chat AI backend |

### Work Service

| Endpoint | Mô tả |
| --- | --- |
| `GET /plans` | Lấy danh sách plan của user hiện tại |
| `POST /plans/create` | Tạo plan mới |
| `GET /plans/{id}` | Lấy chi tiết plan |
| `PUT /plans/update/{id}` | Cập nhật plan |
| `DELETE /plans/delete/{id}` | Xóa plan |
| `GET /tasks` | Lấy danh sách task của user hiện tại |
| `POST /tasks/create/{planId}` | Tạo task trong một plan |

Lưu ý: `TaskServiceImpl` đã có logic update/delete task theo quyền sở hữu, nhưng controller hiện tại mới public route create/list và còn placeholder cho update/delete.

## Công nghệ sử dụng

### Frontend

- React 19
- TypeScript
- Vite
- Express server cho demo/local API
- TanStack React Query
- React Router
- Tailwind CSS
- Lucide React icons
- Motion
- Gemini SDK trong demo frontend server

### Backend Java

- Java 21
- Spring Boot 3.5.14
- Spring Cloud 2025.0.2
- Spring Cloud Gateway
- Eureka Discovery
- Spring Security OAuth2 Resource Server
- Spring Data JPA
- MySQL
- Redis cache
- Kafka
- MapStruct
- Lombok

### Chat Service

- Python
- FastAPI
- LangGraph
- OpenAI-compatible client
- SQLAlchemy
- PyMySQL

## Cấu trúc thư mục

```text
Nexus-Java-Project/
├── api-gateway/          # Gateway route va JWT validation
├── chat-service/         # AI chat backend bang FastAPI
├── common-lib/           # DTO, Kafka topics va event dung chung
├── discovery-server/     # Eureka Server
├── front-end/            # React/Vite UI va Express demo API
├── identity-service/     # User, auth, JWT, Kafka producer
├── work-service/         # Plans, tasks, Redis cache, Kafka consumer
├── docker-compose.yml    # MySQL, Redis, Kafka, chat-service
└── pom.xml               # Maven parent project
```

<!-- ## Cách chạy local

### Yêu cầu môi trường

- Java 21
- Maven wrapper đã có sẵn trong repo
- Node.js và npm
- Docker Desktop
- Python chỉ cần nếu chạy `chat-service` ngoài Docker -->

<!-- ### 1. Chạy hạ tầng

```bash
docker compose up -d identity-mysql work-mysql redis kafka
```

Các service hạ tầng mặc định:

| Service | Port |
| --- | --- |
| Identity MySQL | `3307` |
| Work MySQL | `3308` |
| Redis | `6379` |
| Kafka | `9092` |

### 2. Build backend Java

```bash
./mvnw clean install
```

Trên Windows PowerShell:

```powershell
.\mvnw.cmd clean install
```

### 3. Chạy các Java service

Mở các terminal riêng và chạy theo thứ tự:

```bash
./mvnw -pl discovery-server spring-boot:run
./mvnw -pl identity-service spring-boot:run
./mvnw -pl work-service spring-boot:run
./mvnw -pl api-gateway spring-boot:run
```

Trên Windows PowerShell:

```powershell
.\mvnw.cmd -pl discovery-server spring-boot:run
.\mvnw.cmd -pl identity-service spring-boot:run
.\mvnw.cmd -pl work-service spring-boot:run
.\mvnw.cmd -pl api-gateway spring-boot:run
```

Các port mặc định:

| Service | URL |
| --- | --- |
| Eureka | `http://localhost:8761` |
| API Gateway | `http://localhost:8080` |
| Identity Service | `http://localhost:8081` |
| Work Service | `http://localhost:8082` |

### 4. Chạy frontend

```bash
cd front-end
npm install
npm run dev
```

Frontend mặc định chạy trên:

```text
http://localhost:5137
```

### 5. Chạy Chat Service

Có thể chạy bằng Docker Compose:

```bash
docker compose up -d chat-service
```

Hoặc chạy thủ công:

```bash
cd chat-service
pip install -r requirements.txt
uvicorn api_server:app --host 0.0.0.0 --port 8090
```

Chat service dùng các biến môi trường chính:

```text
CHAT_SERVICE_PORT=8090
JWT_SIGNER_KEY=...
LLM_PROVIDER=openai
LLM_MODEL=gpt-5-mini
LLM_API_KEY=...
WORK_DB_URL=mysql+pymysql://root:123123@localhost:3308/nexus_work_db
```

## Roadmap phát triển

- Kết nối hoàn toàn frontend React với Java API Gateway thay vì demo Express in-memory API.
- Hoàn thiện REST endpoints update/delete task trong `TaskController`.
- Đồng bộ model frontend `stories/roadmaps` với domain `Plan` của backend.
- Thêm refresh token và logout server-side.
- Bổ sung test cho service, controller và gateway security.
- Thêm migration database bằng Flyway hoặc Liquibase.
- Chuẩn hóa cấu hình qua profile `dev`, `test`, `prod`. -->

## Tóm tắt

Nexus Flow là một workspace tập trung cho quản lý công việc, kế hoạch và AI Assistant. Phần giao diện đã có trải nghiệm đầy đủ cho người dùng mới: landing page, auth, dashboard, task board, workspace, calendar và chat AI. Phần backend được tổ chức theo microservices với gateway, discovery, identity, work domain, cache, messaging và chat service, phù hợp để mở rộng thành một sản phẩm SaaS quản lý workflow hoàn chỉnh.
