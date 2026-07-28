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

### 2. Triển khai Database (Database Provisioning)
Cấp phát nhanh các cơ sở dữ liệu (PostgreSQL, MySQL, Redis...) cho người dùng chỉ bằng một cú click chuột.
- **Frontend (FE):**
  - **Vị trí trên giao diện:** Trang Quản lý / Tạo mới Database.
  - **Trang chính:** [page.tsx](file:///e:/Potato/fe/app/dashboard/databases/page.tsx)
  - **Popup tạo Database:** [create-database-modal.tsx](file:///e:/Potato/fe/components/dashboard/create-database-modal.tsx)
- **Backend (BE):**
  - **File:** [databases.service.ts](file:///e:/Potato/be/src/databases/databases.service.ts)
  - **Hàm chính:** `provisionDatabase`
  - **Logic:** Tự động tạo mật khẩu ngẫu nhiên, kéo (pull) image cơ sở dữ liệu tương ứng và khởi động container chứa Database độc lập.

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
          <div className="space-y-2">
            <Label htmlFor="description">Mô tả dự án (Tùy chọn)</Label>
            <Input
              id="description"
              placeholder="Ví dụ: Backend API cho App Mobile..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
```