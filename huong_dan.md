# 🌟 DANH SÁCH CHỨC NĂNG CỐT LÕI (CORE FEATURES) - POTATO PAAS

Tài liệu này liệt kê các **Chức năng chính (Tính năng)** của nền tảng mà không bao gồm các phần sửa lỗi. Mục đích để bạn chỉ ra chính xác cho hội đồng xem đoạn code xử lý của từng chức năng nằm ở đâu trên cả Frontend (Giao diện) và Backend (Máy chủ).

---

### 1. Triển khai Code (Code Deployment)
Cho phép người dùng nhập link GitHub, hệ thống tự động tải code về, đóng gói (Build) và chạy thành ứng dụng thực tế.
- **Frontend (FE):**
  - **Vị trí trên giao diện:** Trang Tạo mới dự án (Create Project).
  - **Component nhập link Git:** [git-deploy.tsx](file:///e:/Potato/fe/components/project/git-deploy.tsx)
  - **Popup tạo dự án:** [create-project-modal.tsx](file:///e:/Potato/fe/components/dashboard/create-project-modal.tsx)
- **Backend (BE):**
  - **File:** [projects.service.ts](file:///e:/Potato/be/src/projects/projects.service.ts)
  - **Các hàm chính:** 
    - `deployFromGit`: Tải mã nguồn về thư mục tạm.
    - `buildDockerImage`: Gọi Docker để đóng gói mã nguồn thành Image.
    - `createContainer`: Khởi tạo và chạy ứng dụng cách ly trong Container.

### 2. Triển khai Database Hiện đại (Modern Database Provisioning)
Cấp phát nhanh các cơ sở dữ liệu (PostgreSQL, MySQL, MongoDB, Redis) cho người dùng theo chuẩn kiến trúc của các PaaS lớn như Vercel/Render.
- **Frontend (FE):**
  - **Vị trí trên giao diện:** Trang Quản lý / Tạo mới Database.
  - **Trang chính:** [page.tsx](file:///e:/Potato/fe/app/dashboard/databases/page.tsx)
  - **Popup tạo Database:** [create-database-modal.tsx](file:///e:/Potato/fe/components/dashboard/create-database-modal.tsx)
- **Backend (BE):**
  - **File:** [databases.service.ts](file:///e:/Potato/be/src/databases/databases.service.ts) và [stats-collector.service.ts](file:///e:/Potato/be/src/projects/stats-collector.service.ts)
  - **Hàm chính:** `provisionDatabaseBackground` (Tạo DB) và `collectStats` (Giám sát DB)
  - **Các cơ chế nổi bật (Under the hood):** 
    1. **Tự động bơm cấu hình (Auto-Inject):** Tự động sinh cả biến rời (`DB_HOST`, `DB_PORT`) cho PHP/Laravel và biến gộp (`DATABASE_URL`) cho Node.js/Prisma/Python, sau đó nhét thẳng vào dự án để lập trình viên xài luôn không cần cấu hình.
    2. **Mô phỏng Connection Pooling:** Tự động chèn cờ `--max_connections=100` và giới hạn cứng RAM ở 512MB lúc tạo Container. Cơ chế này chống lại các cuộc tấn công cạn kiệt tài nguyên hoặc lỗi vòng lặp gọi DB làm sập máy chủ.
    3. **Ngủ đông tiết kiệm RAM (Scale to Zero):** Bot giám sát chạy mỗi 60 giây. Nếu phát hiện Database không có ai truy cập (CPU < 0.1%), hệ thống tự động tạm dừng (Pause) Container DB đó để thu hồi RAM trả về cho máy chủ. Giải quyết triệt để bài toán thiếu RAM khi host nhiều dự án.

### 3. Quản lý Biến Môi Trường (Environment Variables)
Cho phép người dùng cấu hình các biến bảo mật (API Key, DB Host) để nhúng vào ứng dụng lúc đang chạy.
- **Frontend (FE):**
  - **Vị trí trên giao diện:** Trang Chi tiết dự án -> Tab **Cài đặt / Biến môi trường**.
  - **Component Quản lý Biến:** [env-variables-manager.tsx](file:///e:/Potato/fe/components/project/env-variables-manager.tsx)
- **Backend (BE):**
  - **File:** [projects.service.ts](file:///e:/Potato/be/src/projects/projects.service.ts)
  - **Hàm chính:** `updateEnvVariables` và mảng `Env` bên trong hàm `createContainer`.
  - **Logic:** Nhận danh sách biến môi trường từ FE, mã hóa/lưu vào CSDL, và truyền trực tiếp vào Docker Container dưới dạng cấu hình môi trường.

### 4. Hệ thống Nhật ký trực tuyến (Real-time Logs)
Cung cấp màn hình đen (Terminal) để lập trình viên xem nhật ký lỗi của ứng dụng đang chạy theo thời gian thực.
- **Frontend (FE):**
  - **Vị trí trên giao diện:** Màn hình Terminal / Logs của dự án.
  - **Component Terminal Đen:** [terminal-logs.tsx](file:///e:/Potato/fe/components/project/terminal-logs.tsx)
- **Backend (BE):**
  - **File:** [docker.service.ts](file:///e:/Potato/be/src/docker/docker.service.ts)
  - **Hàm chính:** `getContainerLogStream`
  - **Logic:** Gắn (Attach) vào luồng xuất (stdout/stderr) của Docker, dùng NodeJS Stream đẩy dữ liệu liên tục qua mạng (WebSocket) về cho Frontend hiển thị.

### 5. Quản lý Tài khoản (Account Management - CRUD)
Chức năng dành cho Chủ doanh nghiệp để Thêm (Mời), Xóa, Sửa nhân viên cấp dưới.
- **Frontend (FE):**
  - **Vị trí trên giao diện:** Trang Danh sách Nhân viên (Users Management).
  - **Trang Cài đặt & Nhân viên:** [page.tsx](file:///e:/Potato/fe/app/dashboard/settings/page.tsx)
  - **Component Thành viên dự án:** [project-members.tsx](file:///e:/Potato/fe/components/project/project-members.tsx)
- **Backend (BE):**
  - **File Đăng ký:** [auth.controller.ts](file:///e:/Potato/be/src/auth/auth.controller.ts) -> Hàm `register` (Tạo tài khoản).
  - **File Quản trị:** [app.controller.ts](file:///e:/Potato/be/src/app.controller.ts)
  - **Hàm chính:** 
    - `getUsers`: Lấy danh sách nhân viên.
    - `updateUser`: Cập nhật thông tin/Mật khẩu.
    - `deleteUser`: Xóa nhân viên.
    - `updateUserRole`: Thay đổi chức vụ/Thêm vào dự án.

### 6. Quản lý Vai trò (Role & Permissions - CRUD)
Cho phép doanh nghiệp tự định nghĩa các chức danh (Role) mới và cấp phát các quyền hạn chi tiết.
- **Frontend (FE):**
  - **Vị trí trên giao diện:** Trang `http://localhost:3001/dashboard/system/permissions`.
  - **Trang Phân quyền chính:** [page.tsx](file:///e:/Potato/fe/app/dashboard/system/permissions/page.tsx)
- **Backend (BE):**
  - **File:** [roles.controller.ts](file:///e:/Potato/be/src/auth/roles.controller.ts)
  - **Hàm chính:** 
    - `createRole` (@Post): Tạo vai trò mới.
    - `getRoles` (@Get): Hiển thị danh sách vai trò.
    - `updateRole` (@Patch): Chỉnh sửa tên/quyền.
    - `deleteRole` (@Delete): Xóa vai trò.
  - **Cơ chế:** Có thuật toán chặn quyền (Permission Guard) và cô lập dữ liệu (Chỉ thấy Role của công ty mình).

### 7. Giám sát hệ thống (System Monitoring & Auto-Scale)
Theo dõi độ ngốn RAM, CPU của các ứng dụng, vẽ biểu đồ và tự động phản ứng khi có sự cố.
- **Frontend (FE):**
  - **Vị trí trên giao diện:** Biểu đồ (Chart) trên các thẻ (Card) Dự án và Trang `dashboard/system`.
  - **Biểu đồ nhỏ ở ngoài:** [project-card.tsx](file:///e:/Potato/fe/components/dashboard/project-card.tsx)
  - **Biểu đồ chi tiết bên trong:** [metrics-charts.tsx](file:///e:/Potato/fe/components/project/metrics-charts.tsx)
  - **Trang System Host:** [page.tsx](file:///e:/Potato/fe/app/dashboard/system/page.tsx)
- **Backend (BE):**
  - **Quét liên tục (Cronjob):** [stats-collector.service.ts](file:///e:/Potato/be/src/projects/stats-collector.service.ts) -> Hàm `handleCron` (Kiểm tra giới hạn RAM/CPU và tự động kích hoạt Bơm tài nguyên - Auto Scale).
  - **Thời gian thực (Realtime Socket):** Nằm trong cùng file `stats-collector.service.ts` -> Đoạn code phát sóng `stats_update` liên tục mỗi 3 giây về Frontend vẽ biểu đồ.
  - **Giám sát máy chủ Host:** [app.controller.ts](file:///e:/Potato/be/src/app.controller.ts) -> Hàm `getSystemStats` (Đo tổng dung lượng vật lý của máy chủ).
  - **Cảnh báo (Slack):** [projects.service.ts](file:///e:/Potato/be/src/projects/projects.service.ts) -> Hàm `sendSlackAlert` (Tự động gửi thông báo về Slack khi có lỗi hoặc tràn RAM).

### 8. Đăng ký & Đăng nhập (Authentication & JWT)
Bảo mật hệ thống bằng mã thông báo (JSON Web Token - JWT) và phân quyền truy cập.
- **Frontend (FE):**
  - **Vị trí trên giao diện:** Trang Đăng nhập (`/login`) và Đăng ký (`/register`).
  - **Trang Đăng nhập:** [page.tsx](file:///e:/Potato/fe/app/login/page.tsx)
  - **Trang Đăng ký:** [page.tsx](file:///e:/Potato/fe/app/register/page.tsx)
- **Backend (BE):**
  - **File:** [auth.controller.ts](file:///e:/Potato/be/src/auth/auth.controller.ts) và [auth.service.ts](file:///e:/Potato/be/src/auth/auth.service.ts)
  - **Các hàm chính:** `login` và `register`.
  - **Cơ chế (Logic):** 
    - Khi người dùng đăng nhập thành công, hệ thống sử dụng thư viện `@nestjs/jwt` để mã hóa thông tin (ID, Email, Role) thành 1 chuỗi **JWT Token** bí mật trả về cho Frontend. 
    - Frontend lưu chuỗi này lại. Từ đó về sau, mỗi khi gọi API, Frontend bắt buộc phải gửi kèm cái Token này lên (qua Header) để Backend xác thực định danh.

### 9. Trình quản trị Cơ sở dữ liệu trực tuyến (Web SQL Editor)
Cho phép lập trình viên chạy các câu lệnh truy vấn SQL (tạo bảng, chèn dữ liệu, xem bảng) trực tiếp trên trình duyệt mà không cần cài thêm phần mềm DBeaver hay Navicat, cũng không cần bắt buộc phải import file `.sql`.
- **Frontend (FE):**
  - **Vị trí trên giao diện:** Trong trang chi tiết Database, có một ô nhập Query.
- **Backend (BE):**
  - **File:** [databases.service.ts](file:///e:/Potato/be/src/databases/databases.service.ts)
  - **Hàm chính:** `runQuery`
  - **Logic hoạt động:**
    - Khách hàng gõ truy vấn SQL (VD: `SHOW TABLES;` hoặc `CREATE TABLE...`) vào ô nhập liệu.
    - Backend ghi câu lệnh đó ra một file tạm (`.sql`).
    - Gọi hàm `docker exec` để đẩy thẳng file tạm này vào bên trong Container Database đang chạy và thực thi siêu tốc. Kết quả sẽ được định dạng lại thành bảng (Rows & Columns) trả về cho Frontend.

### 10. Tự động triển khai CI/CD & Rollback (Webhook)
Giúp người dùng tự động cập nhật web khi có code mới trên Github, và khôi phục bản cũ nếu code lỗi.
- **Frontend (FE):**
  - **Vị trí trên giao diện:** Tab Cài đặt (Settings) của dự án.
- **Backend (BE):**
  - **File:** [projects.service.ts](file:///e:/Potato/be/src/projects/projects.service.ts)
  - **Hàm chính:** `handleWebhook` và `rollbackProject`
  - **Logic hoạt động:**
    - Tạo một Secret Token. Nhận sự kiện push code từ Github qua webhook.
    - Kích hoạt quy trình tải code và build Docker y hệt mục 1.
    - Có cơ chế **Zero-Downtime**: Chạy container mới, kiểm tra HTTP ping 15s. Nếu sống thì trỏ Nginx qua và xóa container cũ. Nếu lỗi thì xóa container mới, giữ nguyên bản cũ.

### 11. Trợ lý ảo AI Chatbot (Google Gemini)
Trợ lý AI giúp giải đáp thắc mắc, viết giùm Dockerfile chuẩn cho khách.
- **Frontend (FE):**
  - **Vị trí trên giao diện:** Khung Chat Widget trôi ở góc phải màn hình.
  - **Component:** [chat-widget.tsx](file:///e:/Potato/fe/components/chat-widget.tsx)
- **Backend (BE):**
  - **File:** [chat.service.ts](file:///e:/Potato/be/src/chat/chat.service.ts)
  - **Logic hoạt động:**
    - Có cơ chế **LRU Cache (Bộ nhớ đệm chống tràn RAM)**: Lưu trực tiếp cặp Câu hỏi-Trả lời vào đối tượng `Map` của Node.js. 
    - Giới hạn lưu 1000 câu, xóa câu cũ nhất để chống tràn RAM máy chủ. Trả lời tức thì ở tốc độ 0ms không tốn phí API.

### 12. Bảo mật Quên & Khôi phục Mật khẩu (Auth Mailer)
- **Frontend (FE):**
  - **Vị trí trên giao diện:** Trang `/forgot-password` và `/reset-password`.
- **Backend (BE):**
  - **File:** [auth.service.ts](file:///e:/Potato/be/src/auth/auth.service.ts) và [mail.service.ts](file:///e:/Potato/be/src/mail/mail.service.ts)
  - **Logic hoạt động:**
    - Sinh mã bảo vệ ngẫu nhiên (64 kí tự), lưu vào DB giới hạn 15 phút. Gửi mail qua Nodemailer.
    - **Anti-Replay Attack:** Ngay khi khách đổi pass thành công, mã token bị đặt thành null trong DB để vô hiệu hóa hoàn toàn link cũ.

---

## 🎯 CÂU HỎI VẤN ĐÁP "HÓC BÚA" CỦA HỘI ĐỒNG & CÁCH TRẢ LỜI

**❓ Câu hỏi 1: "Làm sao hệ thống của em biết source code người ta tải lên là ngôn ngữ gì (Nodejs, Python hay PHP) để mà chạy?"**
- **Trả lời:** "Dạ, hệ thống của em có một cơ chế **Tự động nhận diện ngôn ngữ (Language Detection)**. Khi tải mã nguồn từ Github về, nó sẽ quét các file đặc trưng trong thư mục gốc:
  - Nếu thấy `composer.json` -> Tự động sinh cấu hình Docker cho **PHP/Laravel**.
  - Nếu thấy `package.json` -> Nhận diện là **Node.js** (Hỗ trợ cả npm, yarn, pnpm, bun).
  - Nếu thấy `requirements.txt` -> Nhận diện là **Python**.
  - Nếu người dùng đã tự viết sẵn file `Dockerfile` -> Tôn trọng cấu hình của người dùng.
  - Nếu không có file nào ở trên -> Mặc định hiểu đây là web tĩnh **Static HTML** và dùng Nginx để chạy.
  Sau khi nhận diện xong, nó sẽ **tự động sinh ra một file Dockerfile** tối ưu tương ứng để tiến hành Build ạ."
- **Code minh chứng:** Nằm ở file [projects.service.ts](file:///e:/Potato/be/src/projects/projects.service.ts) -> Dòng `1100` (Phần Language Detection). Em đã note trong code chữ `[TRẢ LỜI HỘI ĐỒNG]`.

**❓ Câu hỏi 2: "Đoạn code nào chặn lại không cho người dùng tạo/chạy Dự án khi vượt quá Quota RAM?"**
- **Trả lời:** "Dạ thưa thầy/cô, việc chặn Quota được thực hiện ở tầng Controller (ngay trước khi xử lý logic nặng). Khi người dùng bấm Tạo dự án hoặc Khởi động (Start) dự án, hệ thống sẽ chọc xuống Database tính tổng RAM của tất cả các Container **đang ở trạng thái Running** thuộc về công ty đó. Nếu Tổng RAM đang chạy + RAM của dự án chuẩn bị chạy mà lớn hơn Quota cho phép, hệ thống sẽ quăng lỗi `ForbiddenException` và chặn đứng luồng thực thi."
- **Code minh chứng:** Nằm ở file [projects.controller.ts](file:///e:/Potato/be/src/projects/projects.controller.ts) -> Dòng `164` và `179`. Em đã note trong code chữ `[TRẢ LỜI HỘI ĐỒNG]`.

**❓ Câu hỏi 3: "Giao diện Web (Frontend) giao tiếp với cục Docker ở dưới máy chủ bằng cách nào?"**
- **Trả lời:** "Dạ, vì lý do bảo mật tuyệt đối, Frontend **không bao giờ** được phép giao tiếp trực tiếp với Docker Engine. Thay vào đó, nó hoạt động qua 3 lớp:
  1. Frontend gửi yêu cầu HTTP (REST API) hoặc kết nối WebSocket đến Backend (NestJS).
  2. Backend NestJS sau khi kiểm tra Token, Phân quyền (Role/Permission) hợp lệ thì mới sử dụng thư viện `dockerode`.
  3. Thư viện `dockerode` này sẽ nói chuyện với lõi Docker dưới máy chủ (Docker Daemon) thông qua giao thức **Unix Socket Pipe** (`/var/run/docker.sock` trên Linux hoặc Pipe trên Windows). Nhờ vậy hệ thống được cách ly an toàn ạ."

**❓ Câu hỏi 4: "Dữ liệu giám sát hệ thống (RAM, CPU, Ổ cứng) được em lấy từ đâu ra? Ở ổ đĩa nào?"**
- **Trả lời:** "Dạ, dữ liệu giám sát của em được lấy từ **2 nguồn khác biệt** tuỳ theo mục đích:
  1. **Với dữ liệu tổng máy chủ (System Host):** Em dùng trực tiếp thư viện `os` và `fs` của NodeJS chọc thẳng vào Kernel hệ điều hành để đo RAM vật lý (`os.totalmem()`) và CPU (`os.cpus()`). Riêng Ổ cứng thì em dùng hàm `statfsSync` để đo dung lượng của **chính ổ đĩa đang chứa thư mục chạy mã nguồn Backend**.
  2. **Với dữ liệu của từng dự án con (Project Metrics):** Em không lấy từ OS nữa mà gọi qua API của Docker. Lõi Docker tự động duy trì các file **cgroups (Control Groups)** để giới hạn tài nguyên. Code của em sẽ liên tục đọc file cgroups này mỗi 3 giây thông qua hàm `container.stats()` để ra được RAM/CPU mà dự án đó đang ngốn ạ."
- **Code minh chứng:** Nằm ở file [app.controller.ts](file:///e:/Potato/be/src/app.controller.ts) (dòng 50 - đo tổng RAM/Disk) và [stats-collector.service.ts](file:///e:/Potato/be/src/projects/stats-collector.service.ts) (Đo thông số Docker). Em đã note trong code chữ `[TRẢ LỜI HỘI ĐỒNG]`.

---

## 🚀 ĐÁP ÁN THỰC HÀNH "THỬ THÁCH" CỦA HỘI ĐỒNG

Nếu hội đồng bắt bạn mở Code lên và code trực tiếp (Live Coding) để chứng minh bạn tự làm đồ án, hãy mở file này ra và copy/paste theo đúng chỉ dẫn dưới đây!

### 🔧 Thử thách 1: "Thêm hỗ trợ ngôn ngữ lập trình GO (Golang)"
- **Cách trả lời:** "Dạ để thêm Golang, em chỉ cần vào Service xử lý Build, viết thêm 1 đoạn lệnh `if` kiểm tra file `go.mod` và khai báo mẫu `Dockerfile` của Go là hệ thống sẽ tự hiểu ạ."
- **Nơi dán code:** Mở file [projects.service.ts](file:///e:/Potato/be/src/projects/projects.service.ts). Tìm đến khoảng **dòng 1216** (ngay trên chỗ `else if (fs.existsSync(path.join(tmpDir, 'requirements.txt')))` của Python).
- **Code copy dán vào:**
```typescript
        } else if (fs.existsSync(path.join(tmpDir, 'go.mod'))) {
          detectedLang = 'golang';
          await updateLog('Phát hiện Golang (go.mod). Đang tạo cấu hình Docker...');
          fs.writeFileSync(path.join(tmpDir, 'Dockerfile'), \`
FROM golang:1.21-alpine
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o main .
EXPOSE 8080
CMD ["./main"]
          \`.trim());
```

### 🔧 Thử thách 2: "Chặn giới hạn tạo tối đa 3 dự án (Project Count Quota)"
- **Cách trả lời:** "Dạ em sẽ vào hàm `create` của Project Controller, dùng hàm `count` của Prisma để đếm số dự án của doanh nghiệp đó. Nếu >= 3 thì em văng lỗi `BadRequest` chặn lại luôn ạ."
- **Nơi dán code:** Mở file [projects.controller.ts](file:///e:/Potato/be/src/projects/projects.controller.ts). Tìm hàm `@Post()` (khoảng **dòng 92**), dán đoạn này vào ngay sau đoạn `const adminId = requester.parentId || requester.id;`
- **Code copy dán vào:**
```typescript
    // [THỬ THÁCH] - KIỂM TRA GIỚI HẠN SỐ LƯỢNG DỰ ÁN
    const projectCount = await this.prisma.project.count({
      where: {
        OR: [
          { userId: adminId },
          { user: { parentId: adminId } }
        ]
      }
    });
    
    if (projectCount >= 3) {
      throw new BadRequestException('Doanh nghiệp của bạn đã đạt giới hạn tạo tối đa 3 dự án!');
    }
```

### 🔧 Thử thách 3: "Thêm ô nhập 'Mô tả dự án' (Description) trên Giao diện"
- **Cách trả lời:** "Dạ em sẽ mở Component Modal tạo dự án bên Frontend ra, khai báo thêm 1 state (biến) tên là `description` và vẽ thêm một thẻ `<Input>` vào Form html là xong ạ."
- **Nơi dán code 1 (Khai báo biến):** Mở file [create-project-modal.tsx](file:///e:/Potato/fe/components/dashboard/create-project-modal.tsx). Tìm khu vực có các chữ `useState` (khoảng **dòng 15**), dán thêm 1 dòng này vào:
```typescript
  const [description, setDescription] = useState("")
```
- **Nơi dán code 2 (Vẽ giao diện HTML):** Cuộn xuống dưới (khoảng **dòng 60**), tìm đoạn code vẽ thẻ `<Input>` của tên dự án (`Project Name`), và dán khối này ngay bên dưới nó:
```tsx
          <div className="grid gap-2">
            <Label htmlFor="description">Mô tả dự án (Tùy chọn)</Label>
            <Input 
              id="description" 
              placeholder="Nhập mô tả ngắn gọn..." 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
            />
          </div>
```

### 🔧 Thử thách 4: "Mô phỏng quy trình (Luồng) cấp cứu khi Web sập do thiếu Database"
- **Tình huống:** Bị lỗi "Sập Container" (hoặc từ chối kết nối) do lỡ tay bấm **Triển khai Git** trước khi thêm Biến môi trường Database.
- **Cách trả lời & Thao tác chữa cháy:**
  - "Dạ thưa hội đồng, đây là lỗi rất phổ biến. Vì hệ thống của em thiết kế các Container độc lập, nên nếu chưa có biến môi trường thì app không kết nối được Database và sẽ tự thoát. Cách xử lý cực kỳ đơn giản (gọi là Redeploy Workflow):
  - **Bước 1:** Em sang tab **Biến môi trường**, bấm thêm/kết nối Database như bình thường.
  - **Bước 2:** Em quay lại tab Tổng quan, bấm nút **Redeploy (Triển khai lại)**.
  - **Bước 3:** Hệ thống sẽ tự động bắt lấy các biến môi trường mới nhất, đập bỏ Container lỗi và tạo Container mới. App sẽ sống lại ngay lập tức mà không cần phải gỡ dự án ra cài lại ạ!"

### 🔧 Thử thách 5: "Nếu khách hàng tự viết Dockerfile (custom) mà ghi sai cú pháp thì hệ thống xử lý thế nào?"
- **Cách trả lời (Khoe tính năng xịn):**
  - "Dạ thưa hội đồng, hệ thống của em được thiết kế theo chuẩn **Triển khai Không gián đoạn (Zero-Downtime Deployment)** và có cơ chế **Bắt lỗi an toàn (Graceful Error Handling)**.
  - Cụ thể, khi phát hiện Dockerfile của người dùng tải lên, em sẽ cho Build Image ở một luồng độc lập. Nếu Dockerfile ghi sai cú pháp, lệnh Build sẽ văng lỗi. Lúc này, khối \`try...catch\` ở hàm \`deployFromGit\` sẽ bắt được lỗi này.
  - **Hệ thống sẽ làm 3 việc:**
    1. Đẩy toàn bộ dòng log lỗi đó lên màn hình Terminal của Frontend để khách hàng biết họ ghi sai ở dòng nào.
    2. Đánh dấu bản Deploy này là \`Failed\` (Thất bại).
    3. **Quan trọng nhất:** Hệ thống **VẪN GIỮ NGUYÊN Container cũ** đang chạy! Do đó, website của khách hàng không hề bị sập một giây nào cả dù họ vừa deploy lỗi. Họ chỉ việc lên Github sửa lại Dockerfile rồi bấm Deploy lại là xong ạ!"
- **Code minh chứng:** Mở file \`projects.service.ts\`, cuộn xuống dòng **1466** (chỗ khối \`catch (error)\`). Giải thích rằng nhờ khối catch này mà hệ thống bắt được lỗi, cập nhật trạng thái \`failed\`, nhưng hoàn toàn không đụng chạm hay xóa đi Container cũ đang chạy.