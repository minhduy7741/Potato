# TÀI LIỆU HƯỚNG DẪN CÀI ĐẶT VÀ VẬN HÀNH HỆ THỐNG POTATO IDP
*(Tài liệu phục vụ nghiệm thu và báo cáo đồ án/luận văn)*

Tài liệu này hướng dẫn chi tiết cách thiết lập môi trường, cấu hình các dịch vụ, khởi chạy và kiểm thử các tính năng cốt lõi của hệ thống **Potato IDP** (Internal Developer Platform) trên môi trường máy chủ cục bộ (localhost).

---

## PHẦN 1: TỔNG QUAN HỆ THỐNG
Hệ thống **Potato IDP** là một nền tảng tự động hóa quá trình đóng gói, triển khai và giám sát ứng dụng cũng như cơ sở dữ liệu (tương tự như Heroku hoặc Vercel thu nhỏ). Hệ thống được chia thành 3 phần chính:
1. **Frontend (fe)**: Xây dựng bằng Next.js, TailwindCSS 4, Framer Motion và Socket.io-client.
2. **Backend (be)**: Xây dựng bằng NestJS, sử dụng Prisma ORM kết nối cơ sở dữ liệu quản trị, tích hợp Docker Engine SDK để tương tác và điều khiển trực tiếp Docker daemon trên máy chủ.
3. **Database & Container Management**: Sử dụng PostgreSQL để lưu trữ cấu hình hệ thống, và Docker Engine để quản lý vòng đời các container ứng dụng của người dùng.

---

## PHẦN 2: CHUẨN BỊ MÔI TRƯỜNG (PREREQUISITES)

Trước khi bắt đầu khởi chạy dự án, hãy đảm bảo máy tính của bạn đã được cài đặt đầy đủ các công cụ sau:

1. **Node.js (Phiên bản khuyến nghị: v18 trở lên hoặc v20 LTS)**
   - Tải về từ: [https://nodejs.org/](https://nodejs.org/)
   - Kiểm tra phiên bản bằng lệnh: `node -v` và `npm -v`

2. **Docker Desktop (Bắt buộc phải khởi động)**
   - Hệ thống Potato IDP tương tác trực tiếp với Docker Engine. Do đó, Docker Desktop cần phải chạy liên tục.
   - Tải về từ: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
   - **Lưu ý đối với Windows:** Đảm bảo Docker Desktop đã được tích hợp với WSL 2 (nếu bạn sử dụng WSL) hoặc đang chạy chế độ Windows Containers/Linux Containers mặc định. Hệ thống tự động kết nối qua Named Pipe: `\\.\pipe\docker_engine` trên Windows hoặc `/var/run/docker.sock` trên Linux/macOS.

3. **Git CLI**
   - Dùng để clone mã nguồn ứng dụng phục vụ cho luồng chạy thử nghiệm triển khai.
   - Tải về từ: [https://git-scm.com/](https://git-scm.com/)

---

## PHẦN 3: CẤU HÌNH BIẾN MÔI TRƯỜNG (.ENV)

### 1. Cấu hình Backend (`be/.env`)
Tạo một file đặt tên là `.env` tại thư mục `/be` nếu chưa có và cấu hình các giá trị sau:

```ini
# Đường dẫn kết nối Database PostgreSQL quản trị hệ thống
DATABASE_URL="postgresql://potato:potato_password@127.0.0.1:5433/potato_projects?schema=public"

# Khóa bí mật dùng để mã hóa mã JWT xác thực người dùng
JWT_SECRET="potato-super-secret-key-change-in-production"

# Thời hạn hiệu lực của Token JWT
JWT_EXPIRES_IN="7d"
```

*Lưu ý:* Cơ sở dữ liệu mặc định chạy trên cổng `5433` (để tránh xung đột với cổng PostgreSQL `5432` mặc định của hệ điều hành nếu có).

---

## PHẦN 4: HƯỚNG DẪN CÁC BƯỚC KHỞI CHẠY DỰ ÁN

Thực hiện lần lượt các bước sau trong terminal:

### Bước 1: Khởi tạo Cơ sở dữ liệu quản trị (PostgreSQL)
Mở cửa sổ Terminal thứ nhất, di chuyển vào thư mục `be/` và khởi động container PostgreSQL:
```bash
cd be
docker-compose up -d
```
*Lệnh này sẽ tải ảnh Docker PostgreSQL 15 và chạy ngầm một container tên là `db` phục vụ lưu trữ cấu hình hệ thống.*

### Bước 2: Cài đặt thư viện & Đồng bộ Database Schema (Backend)
Vẫn tại cửa sổ Terminal của `be/`, chạy các lệnh sau:
```bash
# Cài đặt toàn bộ dependencies
npm install

# Đẩy cấu hình Schema Prisma vào PostgreSQL
npx prisma db push
```

### Bước 3: Khởi tạo dữ liệu mẫu (Seeding)
Hệ thống hỗ trợ script seeding để tạo sẵn các tài khoản thử nghiệm cũng như các dự án giả lập để thầy cô dễ quan sát. Chạy lệnh sau trong thư mục `be/`:
```bash
npx ts-node prisma/seed-test-data.ts
```
Khi chạy thành công, màn hình sẽ hiển thị:
```text
🌱 Starting Seeding Test Data...
✅ Admin user created.
✅ Regular user created.
✅ Seeding complete! 4 projects and 3 databases created.
```

### Bước 4: Khởi chạy Backend Server
Khởi động backend ở chế độ phát triển để theo dõi log trực tiếp:
```bash
npm run start:dev
```
- **Cổng mặc định:** `http://localhost:3000`
- **Tài liệu API Swagger (nếu có):** Xem các endpoint tại mã nguồn.

### Bước 5: Cài đặt và Khởi chạy giao diện người dùng (Frontend)
Mở cửa sổ Terminal thứ hai tại thư mục gốc của dự án, di chuyển vào thư mục `fe/` và thực hiện:
```bash
cd fe
npm install
npm run dev
```
- **Cổng mặc định:** `http://localhost:3001`
- Giao diện sẽ được mở tại: [http://localhost:3001](http://localhost:3001)

---

## PHẦN 5: THÔNG TIN TÀI KHOẢN ĐĂNG NHẬP MẶC ĐỊNH

Sau khi seeding dữ liệu, bạn có thể đăng nhập bằng một trong ba tài khoản mặc định sau:

| Vai trò | Email đăng nhập | Mật khẩu mặc định | Quyền hạn đặc trưng |
| :--- | :--- | :--- | :--- |
| **Siêu quản trị (Super Admin)** | `superadmin@potato.com` | `superadminpassword` | Quyền tối cao (Root). Là tài khoản duy nhất được phép truy cập trang giám sát hệ thống máy chủ vật lý (System Host Monitor). |
| **Quản trị doanh nghiệp (Admin)** | `admin@potato.com` | `adminpassword` | Tài khoản quản lý cấp công ty (DEVELOPER + Custom Role Admin). Quản lý dự án, thiết lập vai trò (Roles), phân quyền nhân viên và tạo database. |
| **Lập trình viên (Regular User)** | `user@potato.com` | `userpassword` | Nhân viên thông thường (DEVELOPER). Bị giới hạn quyền, chỉ quản trị dự án cá nhân được phân bổ. |

## PHẦN 6: GIẢI THÍCH LUỒNG CÔNG NGHỆ CÁC TÍNH NĂNG NỔI BẬT

### 1. Trợ lý ảo AI (Chatbot) & Cơ chế chống tràn RAM (LRU Cache)
Hệ thống tích hợp Google Gemini AI để hỗ trợ lập trình viên (hướng dẫn tạo Dockerfile, sửa lỗi code...). Tuy nhiên, việc gọi API AI liên tục sẽ tốn kém và chậm trễ. Potato PaaS giải quyết bằng cách:
- **Lưu Cache trực tiếp trên RAM (Node.js Map):** Thay vì lưu vào Database, hệ thống lưu kết quả Hỏi-Đáp vào RAM để có tốc độ phản hồi tính bằng mili-giây (0ms).
- **Kích thước siêu nhẹ:** Dữ liệu lưu trữ chỉ là văn bản (Text). 1.000 cặp câu hỏi-đáp chỉ tốn khoảng 2MB - 5MB RAM, hoàn toàn không đáng kể so với dung lượng hàng Gigabyte của máy chủ.
- **Cơ chế chống tràn bộ nhớ (LRU - Least Recently Used):** Dù nhẹ, hệ thống vẫn cài đặt giới hạn an toàn là 1.000 câu hỏi. Khi câu số 1.001 được nạp vào, hệ thống tự động xóa đi câu hỏi cũ nhất. Điều này triệt tiêu hoàn toàn rủi ro rò rỉ bộ nhớ (Memory Leak) làm sập máy chủ.

### 2. Tự động triển khai CI/CD (Webhook & Zero-downtime)
Hệ thống tự xây dựng (in-house) luồng CI/CD mà không cần dựa vào Jenkins nặng nề:
- **Webhook & Github:** Khi người dùng `git push`, Github tự động bắn tín hiệu (HTTP POST) về máy chủ Potato PaaS kèm token xác thực.
- **Tự động nhận diện (Nixpacks/Buildpacks Style):** Máy chủ tải code về, tự động quét tìm `package.json`, `composer.json`... để tự sinh file `Dockerfile` chuẩn nhất rồi gọi Docker Engine đóng gói.
- **Triển khai không gián đoạn (Zero-Downtime):** 
  - Nếu code mới bị lỗi (Build Failed hoặc Health Check không phản hồi HTTP), máy chủ lập tức gỡ bỏ bản mới và **không can thiệp bản web cũ**, giúp website của khách hàng luôn online.
  - Sau khi chuyển giao thành công, **bộ dọn rác (Garbage Collection)** tự động kích hoạt: Xóa Container cũ, xóa Image Docker thừa và dọn dẹp thư mục code tạm để chống phình ổ cứng.

### 3. Tính năng Quên & Khôi phục mật khẩu (Secure Password Reset)
- **Bảo mật tuyệt đối:** Khi người dùng nhập email quên mật khẩu, Backend luôn trả về thông báo chung chung ("Nếu email tồn tại..."), ngăn chặn hacker cào dữ liệu email của hệ thống.
- **Bảo vệ mã Token (Anti-Replay Attack):** Sinh token ngẫu nhiên độ dài 64 ký tự (giới hạn 15 phút). Ngay khi người dùng đổi mật khẩu thành công, token này lập tức bị **xóa bỏ (set null)** trong Database, đảm bảo link khôi phục cũ trở thành vô dụng, chống việc tái sử dụng.

---

## PHẦN 7: MỘT SỐ LỖI THƯỜNG GẶP & CÁCH KHẮC PHỤC (TROUBLESHOOTING)

### 1. Lỗi: *Không thể kết nối đến Docker (Docker Socket Error)*
- **Nguyên nhân:** Docker Desktop chưa được khởi động hoặc tiến trình Docker Engine bị treo.
- **Cách xử lý:** 
  - Khởi động Docker Desktop.
  - Trên Windows, mở Powershell chạy quyền Administrator và gõ lệnh `docker ps` để kiểm tra kết nối. Nếu lệnh này lỗi, hãy restart lại dịch vụ Docker Desktop.

### 2. Lỗi: *Không thể chạy `db push` hoặc kết nối database lỗi*
- **Nguyên nhân:** Cổng `5433` bị chiếm dụng hoặc Container PostgreSQL chưa được chạy thành công.
- **Cách xử lý:** 
  - Chạy lệnh `docker ps` xem container `be-db-1` có đang ở trạng thái `Up` không.
  - Nếu cổng `5433` bị trùng, bạn có thể sửa cổng map trong `be/docker-compose.yml` (ví dụ sửa thành `'5434:5432'`) đồng thời thay đổi biến `DATABASE_URL` trong file `be/.env` tương ứng thành `127.0.0.1:5434`.

### 3. Lỗi: *Không mở được cổng ứng dụng trên Windows (EPERM hoặc Bind Error)*
- **Nguyên nhân:** Windows đôi khi chặn các cổng lạ hoặc do ứng dụng khác đang chiếm giữ dải cổng cấp phát ngẫu nhiên (10000 - 19999).
- **Cách xử lý:** Xóa bớt các container cũ không dùng thông qua giao diện quản trị Potato IDP hoặc Docker Desktop để giải phóng cổng.

### 4. Cách kiểm tra dữ liệu trực tiếp trong Database quản trị:
Để xem trực quan các bảng của hệ thống (User, Project, Logs) lưu trong PostgreSQL, mở một terminal mới tại `/be` và chạy:
```bash
npx prisma studio
```
*Trình duyệt sẽ tự động mở trang quản trị cơ sở dữ liệu tại địa chỉ `http://localhost:5555` để chỉnh sửa hoặc xóa dữ liệu nhanh.*

---
**Chúc bạn hoàn thành buổi nghiệm thu và báo cáo đồ án thành công rực rỡ!**