# Hướng Dẫn Cấu Trúc Cơ Sở Dữ Liệu - Potato PaaS

Đây là tài liệu phân tích chi tiết toàn bộ 11 bảng (Tables) trong hệ thống cơ sở dữ liệu của nền tảng Potato PaaS, kèm theo ý nghĩa của từng trường dữ liệu (fields) và mối quan hệ ràng buộc (relationships).

---

## Nhóm 1: Quản Trị Người Dùng & Phân Quyền

### 1. Bảng `User` (Khách hàng / Quản trị viên)
Đây là bảng trung tâm lưu trữ tài khoản của toàn hệ thống.
- **`id`**: Mã định danh duy nhất của người dùng.
- **`email`, `password`, `name`**: Thông tin đăng nhập cơ bản.
- **`role`**: Quyền hạn toàn cục (Ví dụ: `ADMIN` - được quản trị toàn hệ thống, `DEVELOPER`, `USER`).
- **`parentId`**: Hỗ trợ tính năng "Tài khoản phụ". Một tài khoản công ty có thể tạo ra các tài khoản nhân viên (ID của sếp sẽ nằm ở đây).
- **`customRoleId`**: ID của vai trò tùy chỉnh nếu user này được gán một vai trò đặc biệt.
- **`maxRam`, `maxDisk`**: Tổng dung lượng RAM (MB) và Ổ cứng (GB) tối đa mà người này được phép xài (Cộng dồn tất cả dự án lại không được vượt mức này).
- **`maxProjects`, `maxDatabases`**: Số lượng App và DB tối đa được phép tạo.
- **`resetPasswordToken`, `resetPasswordExpires`**: Phục vụ tính năng quên mật khẩu.

**Mối quan hệ:**
- **1 User -> Nhiều Project (1-N):** 1 người dùng làm chủ (sở hữu) nhiều dự án.
- **1 User -> Nhiều ProjectMember (1-N):** 1 người dùng có thể tham gia vào nhiều dự án của người khác.
- **1 User (1-N) với chính nó:** 1 tài khoản cấp cao tạo ra nhiều tài khoản con (`parentId`).

### 2. Bảng `CustomRole` (Vai trò tùy chỉnh)
Cho phép SuperAdmin tạo ra các chức danh linh hoạt thay vì chỉ dùng Role cứng.
- **`name`**: Tên vai trò (VD: "Kế toán", "Tester").
- **`permissions`**: Danh sách quyền hạn (VD: `["project:read", "logs:read"]`).
- **`assignableByManager`**: Quản lý cấp trung có được phép gán role này cho nhân viên không.
- **`ownerId`**: ID của Admin đã tạo ra vai trò này.

**Mối quan hệ:**
- **1 CustomRole -> Nhiều User (1-N):** 1 vai trò có thể gán cho nhiều người dùng.

### 3. Bảng `ProjectMember` (Thành viên tham gia dự án)
Bảng trung gian kết nối `User` và `Project`.
- **`userId` + `projectId`**: Cặp khóa ngoại để biết "Ông A đang ở trong Dự án B".
- **`role`**: Chức vụ TRONG DỰ ÁN NÀY (VD: `LEADER`, `DEVELOPER`, `VIEWER`).
- **`permissions`**: Danh sách quyền đặc biệt cấp riêng cho người này trong dự án.

---

## Nhóm 2: Quản Lý Dự Án & Cấu Hình

### 4. Bảng `Project` (Dự án / App / Container)
Bảng quan trọng nhất, đại diện cho 1 website/ứng dụng đang chạy trên hệ thống.
- **`id`, `name`**: Mã và tên dự án.
- **`containerId`**: Chuỗi ID của Docker Container đang chạy ngầm trên máy chủ Linux.
- **`status`**: Trạng thái (đang chạy, đã dừng, lỗi).
- **`ramLimit`, `cpuLimit`**: Mức RAM/CPU tối đa cấp cho App (VD: 512MB RAM, 0.5 CPU).
- **`hostPort`**: Cổng mạng được hệ thống bốc ngẫu nhiên (VD: 8080).
- **`subdomain`, `customDomain`**: Tên miền cấp phát (`app.potato.com`) hoặc tên miền riêng (`app.vn`).
- **`sslStatus`, `sslExpiry`**: Trạng thái chứng chỉ HTTPS (none, pending, active).
- **`gitRepo`, `deployBranch`, `gitToken`**: Cấu hình kéo code từ Github (link repo, nhánh code, mật khẩu repo kín).
- **`deployStatus`, `lastDeployedAt`**: Tình trạng lần build code gần nhất.
- **`restartPolicy`**: Quy tắc khởi động lại khi crash (`no`, `on-failure`, `always`).
- **`autoScale`**: Tự động tăng RAM/CPU nếu quá tải (True/False).
- **`volumeMapping`**: Đường dẫn thư mục bảo vệ dữ liệu cứng (VD: `/app/storage`).
- **`slackWebhook`, `alertInterval`**: Cấu hình cảnh báo sập server qua Slack.
- **`userId`**: Chủ sở hữu (Owner) của dự án này.

**Mối quan hệ:**
- **1 Project -> Nhiều EnvVariable, DeploymentLog, ActivityLog, ProjectStat, DatabaseInstance (Đều là 1-N).**

### 5. Bảng `EnvVariable` (Biến môi trường)
- **`key`**: Tên biến (VD: `PORT`, `API_KEY`).
- **`value`**: Giá trị biến.
- **`isSecret`**: Nếu `True`, biến sẽ bị che mờ (`******`) trên giao diện để bảo mật.

### 6. Bảng `SystemConfig` (Cài đặt hệ thống toàn cục)
- **`isChatbotEnabled`**: Bật/Tắt trợ lý ảo AI trên toàn hệ thống.
- **`chatbotSystemPrompt`**: Định nghĩa tính cách và khối lượng kiến thức cho con Bot AI.

---

## Nhóm 3: Triển Khai, Theo Dõi & Thống Kê

### 7. Bảng `DeploymentLog` (Lịch sử Build/Deploy)
- **`trigger`**: Ai kích hoạt build? (`manual` - bấm bằng tay, `git-push` - tự động do webhook).
- **`status`**: Trạng thái build (pending, running, success, failed).
- **`gitCommit`, `gitMessage`**: Mã Hash và lời nhắn của lần commit code đó (để rollback khi cần).
- **`duration`**: Thời gian build mất bao nhiêu giây.
- **`log`**: Toàn bộ dòng chữ console lúc build code để debug lỗi.

### 8. Bảng `ActivityLog` (Lịch sử hoạt động)
Lưu vết mọi hành động của người dùng để truy cứu trách nhiệm.
- **`type`**: Loại hành động (`START`, `STOP`, `RESTART`, `DEPLOY`).
- **`message`**: Lời nhắn cụ thể (VD: "User Admin vừa khởi động lại server").

### 9. Bảng `ProjectStat` (Thống kê tài nguyên)
- **`cpuUsage`**: Phần trăm CPU đang sử dụng (0-100%).
- **`ramUsage`**: Mức RAM đang sử dụng (MB).
- *Lưu ý: Bảng này nhận dữ liệu liên tục (vài giây 1 dòng) để vẽ biểu đồ lượn sóng trên Dashboard.*

---

## Nhóm 4: Quản Lý Cơ Sở Dữ Liệu

### 10. Bảng `DatabaseInstance` (Database dùng riêng)
- **`name`**: Tên Database.
- **`type`**: Loại Database (PostgreSQL, MySQL, Redis, v.v...).
- **`status`**: Trạng thái (provisioning, running, stopped).
- **`connectionString`**: Đoạn mã quan trọng để kết nối (VD: `postgresql://user:pass@localhost:5432/db`).

**Mối quan hệ:**
- **1 DatabaseInstance -> Nhiều DatabaseActivityLog (1-N).**

### 11. Bảng `DatabaseActivityLog` (Nhật ký Database)
- **`action`**: Hành động (IMPORT, EXPORT, CHANGE_PASSWORD).
- **`filename`**: Tên file sao lưu SQL (nếu có).
- **`status`**: Thành công hay Thất bại.
- **`message`**: Thông tin lỗi (nếu thất bại).
