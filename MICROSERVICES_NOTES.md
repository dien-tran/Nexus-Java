# Nexus Microservices Notes

File này tóm tắt những thay đổi đã làm khi chuyển project Nexus từ monolith sang microservices, và giải thích chi tiết phần Kafka để bạn có thể đọc lại khi học.

## 1. Kiến trúc tổng quan

Project hiện tại đã được chuyển sang Maven multi-module. Root project chỉ còn vai trò parent, code chạy thật nằm trong từng module riêng.

```text
Nexus-Java
├── common-lib
├── discovery-server
├── api-gateway
├── identity-service
├── work-service
├── docker-compose.yml
└── pom.xml
```

Ý nghĩa từng module:

- `common-lib`: chứa code dùng chung, ví dụ `ApiResponse`, Kafka event `UserCreatedEvent`, tên topic Kafka.
- `discovery-server`: Eureka Server, nơi các service đăng ký để tìm nhau.
- `api-gateway`: cửa ngõ duy nhất cho client gọi API.
- `identity-service`: quản lý user, đăng ký, login, verify JWT.
- `work-service`: quản lý plan và task.

Thư mục `src/` ở root đã được xoá vì đó là code monolith cũ. Mỗi module vẫn có thư mục `src/` riêng của nó.

## 2. API Gateway và public endpoint

Client gọi API qua Gateway ở port `8080`.

Gateway expose API với prefix `/api`, ví dụ:

```text
POST /api/auth/login
POST /api/auth/verify
POST /api/users/create
GET  /api/plans
POST /api/tasks/create/{planId}
```

Gateway sẽ strip prefix `/api` trước khi route xuống service nội bộ:

```text
/api/auth/login      -> identity-service /auth/login
/api/users/create    -> identity-service /users/create
/api/plans           -> work-service /plans
/api/tasks           -> work-service /tasks
```

Chỉ có đúng 3 business endpoint public:

```text
POST /api/auth/login
POST /api/auth/verify
POST /api/users/create
```

Tất cả endpoint khác bắt buộc có JWT.

## 3. Eureka Discovery Server

`discovery-server` chạy ở port `8761`.

Vai trò của Eureka:

- `identity-service`, `work-service`, `api-gateway` tự đăng ký vào Eureka.
- Gateway không cần hard-code host/port của service.
- Gateway route bằng service name, ví dụ `lb://identity-service`, `lb://work-service`.

Trong môi trường local, nên chạy `discovery-server` trước các service khác.

Thứ tự chạy để dễ debug:

```text
1. docker compose up -d identity-mysql work-mysql redis kafka
2. discovery-server
3. identity-service
4. work-service
5. api-gateway
```

## 4. Tách database

Trước đây monolith dùng chung database và có quan hệ JPA trực tiếp:

```text
User -> Plan -> Task
```

Sau khi tách microservices:

- `identity-service` sở hữu user và database `nexus_identity_db`.
- `work-service` sở hữu plan/task và database `nexus_work_db`.
- `Plan` không liên kết JPA trực tiếp tới `User` nữa.
- `Plan` chỉ lưu `ownerUserId`.

Điều này đúng hơn với microservices vì mỗi service tự sở hữu dữ liệu của nó.

## 5. Luồng user và plan

Khi tạo user:

```text
POST /api/users/create
```

Kết quả:

- User được lưu trong `identity-service`.
- `identity-service` publish Kafka event `identity.user.created.v1`.
- `work-service` consume event và lưu projection tối thiểu vào `UserProjection`.
- Chưa tạo plan, nên bảng `Plan` chưa có `ownerUserId`.

Khi login:

```text
POST /api/auth/login
```

Kết quả:

- `identity-service` trả về JWT.
- JWT có `subject = userId`.

Khi tạo plan:

```text
POST /api/plans/create
Authorization: Bearer <token>
```

Kết quả:

- `work-service` đọc `userId` từ JWT.
- `Plan.ownerUserId` được set bằng userId đó.

Tóm lại: tạo user chưa tạo plan. Chỉ khi user gọi API tạo plan thì `ownerUserId` mới được lưu vào plan.

## 6. Redis

Redis đã được apply vào `work-service`.

Redis dùng để cache:

- danh sách plan theo user
- chi tiết plan theo user và plan id
- danh sách task theo user

Redis chạy trong Docker:

```yaml
redis:
  image: redis:7.4-alpine
  ports:
    - "6379:6379"
```

`work-service` kết nối Redis qua:

```yaml
spring:
  data:
    redis:
      host: localhost
      port: 6379
```

TTL cache hiện tại là `10m`.

## 7. Kafka trong dự án này

### 7.1 Kafka là gì?

Kafka là message broker/event streaming platform.

Nó cho phép service này gửi message/event, service khác nhận message/event mà không cần gọi trực tiếp nhau bằng REST.

Ví dụ trong dự án:

```text
identity-service tạo user thành công
        |
        | publish event
        v
Kafka topic identity.user.created.v1
        |
        | consume event
        v
work-service lưu UserProjection
```

Như vậy `identity-service` không cần biết `work-service` đang ở đâu, có port nào, có đang online ngay lúc đó hay không.

### 7.2 Producer, Consumer, Topic là gì?

Trong Kafka có 3 khái niệm chính bạn cần nắm:

- Producer: service gửi message vào Kafka.
- Consumer: service đọc message từ Kafka.
- Topic: tên "kênh" chứa message.

Trong project này:

```text
Producer: identity-service
Consumer: work-service
Topic: identity.user.created.v1
```

Tên topic được đặt trong:

```text
common-lib/src/main/java/com/nexus/common/kafka/KafkaTopics.java
```

Event dùng chung nằm trong:

```text
common-lib/src/main/java/com/nexus/common/event/UserCreatedEvent.java
```

### 7.3 Vì sao cần Kafka ở đây?

Nếu không dùng Kafka, khi tạo user thành công, `identity-service` có thể phải gọi REST sang `work-service`:

```text
identity-service -> HTTP -> work-service
```

Cách này có vấn đề:

- `identity-service` bị phụ thuộc vào `work-service`.
- Nếu `work-service` đang down, tạo user có thể bị lỗi.
- Sau này thêm service khác cần nghe user-created thì phải sửa code identity-service để gọi thêm service đó.

Dùng Kafka thì tốt hơn:

```text
identity-service -> Kafka
work-service     <- Kafka
notification     <- Kafka
analytics        <- Kafka
```

`identity-service` chỉ cần publish event một lần. Service nào cần thì tự subscribe.

### 7.4 Event đang gửi gồm gì?

Event `UserCreatedEvent` gồm:

```java
String userId;
String name;
String email;
Instant createdAt;
```

Đây là dữ liệu tối thiểu để service khác biết rằng có user mới.

Chú ý: không gửi password qua Kafka.

### 7.5 Luồng Kafka khi tạo user

Khi gọi:

```text
POST /api/users/create
```

Luồng xử lý:

```text
Client
  -> API Gateway
  -> identity-service
  -> lưu User vào MySQL identity
  -> publish UserCreatedEvent vào Kafka
  -> Kafka topic identity.user.created.v1
  -> work-service consume event
  -> lưu UserProjection vào MySQL work
```

`UserProjection` không phải user chính. Nó chỉ là bản sao tối thiểu trong `work-service`.

User chính vẫn do `identity-service` sở hữu.

### 7.6 Kafka chạy ở đâu?

Kafka chạy bằng Docker Compose, không chạy local bằng cài đặt riêng.

Trong `docker-compose.yml`:

```yaml
kafka:
  image: bitnami/kafka:3.9
  ports:
    - "9092:9092"
```

Service Java chạy trên máy host kết nối tới Kafka container qua:

```yaml
spring:
  kafka:
    bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
```

Nghĩa là mặc định service sẽ kết nối:

```text
localhost:9092
```

Nếu sau này chạy service cùng trong Docker network, có thể đổi biến môi trường:

```text
KAFKA_BOOTSTRAP_SERVERS=kafka:9092
```

### 7.7 ZooKeeper có cần không?

Không cần.

Kafka trong project đang chạy KRaft mode:

```yaml
KAFKA_CFG_PROCESS_ROLES: broker,controller
```

KRaft là cách Kafka mới tự quản lý metadata/controller mà không cần ZooKeeper.

ZooKeeper chỉ cần khi:

- dùng Kafka cũ
- công ty hoặc môi trường production đang có Kafka legacy cluster
- tài liệu cũ bắt buộc cấu hình ZooKeeper

Với project này, Kafka KRaft single-node là đủ cho local/dev.

### 7.8 Consumer group là gì?

Trong `work-service`, consumer có group id:

```yaml
spring:
  kafka:
    consumer:
      group-id: work-service
```

Consumer group giúp Kafka biết nhóm service nào đã đọc message.

Nếu sau này có nhiều instance `work-service`, các instance cùng group `work-service` sẽ chia nhau đọc partition. Điều này giúp scale consumer.

### 7.9 Auto create topic

Docker Compose đang bật:

```yaml
KAFKA_CFG_AUTO_CREATE_TOPICS_ENABLE: true
```

Nghĩa là khi producer gửi vào topic `identity.user.created.v1`, Kafka có thể tự tạo topic nếu topic chưa tồn tại.

Đây là cấu hình tiện cho local/dev. Trong production thường nên tạo topic rõ ràng trước và tắt auto-create.

### 7.10 Điều cần nhớ khi dùng Kafka

Kafka không nên dùng để thay thế mọi REST API.

Nên dùng Kafka khi:

- service A phát sinh sự kiện, service B/C/D muốn nghe
- không cần response ngay lập tức
- muốn giảm coupling giữa các service
- muốn xử lý bất đồng bộ

Nên dùng REST khi:

- cần kết quả ngay
- query dữ liệu trực tiếp
- action phụ thuộc vào response của service khác

Trong project này:

- Login dùng REST vì client cần token ngay.
- Tạo plan dùng REST vì client cần kết quả tạo plan ngay.
- User-created dùng Kafka vì đó là event thông báo cho service khác.

## 8. Lệnh chạy nhanh

Chạy infrastructure:

```powershell
docker compose up -d identity-mysql work-mysql redis kafka
```

Chạy từng service bằng Maven:

```powershell
mvn -pl discovery-server spring-boot:run
mvn -pl identity-service spring-boot:run
mvn -pl work-service spring-boot:run
mvn -pl api-gateway spring-boot:run
```

Nếu `mvnw.cmd` trên máy bị lỗi wrapper, có thể dùng Maven distribution trong `.m2/wrapper/dists` hoặc cài Maven global.

Kiểm tra build/test:

```powershell
mvn test
```

## 9. Endpoint test nhanh

Tạo user:

```text
POST http://localhost:8080/api/users/create
```

Login:

```text
POST http://localhost:8080/api/auth/login
```

Tạo plan cần JWT:

```text
POST http://localhost:8080/api/plans/create
Authorization: Bearer <token>
```

Lấy danh sách plan cần JWT:

```text
GET http://localhost:8080/api/plans
Authorization: Bearer <token>
```

Tạo task cần JWT:

```text
POST http://localhost:8080/api/tasks/create/{planId}
Authorization: Bearer <token>
```
