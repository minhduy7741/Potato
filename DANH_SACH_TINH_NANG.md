# 🥔 Danh Sách Tính Năng Hệ Thống Potato IDP (Bản Nháp Gửi Thầy Hướng Dẫn)

Đây là bản tóm tắt ngắn gọn các tính năng của hệ thống **Potato IDP** (nền tảng tự động triển khai ứng dụng và cơ sở dữ liệu giống như Heroku hoặc Vercel thu nhỏ) để gửi thầy hướng dẫn duyệt trước.

---

## 🌟 PHẦN 1: CÁC TÍNH NĂNG "KEY" CỦA DỰ ÁN
*Đây là những tính năng đặc biệt, có độ khó kỹ thuật cao và là điểm nhấn chính của luận văn.*

### 1. Deploy không gián đoạn (Zero-downtime) & Tự động quay về bản cũ (Auto-Rollback)
*   **Cách hoạt động:** 
    *   Khi bạn cập nhật phiên bản mới của trang web, hệ thống không tắt trang web cũ ngay lập tức. Thay vào đó, nó sẽ khởi chạy phiên bản mới ở một cổng chạy ẩn và liên tục gửi yêu cầu kiểm tra xem phiên bản mới đã khởi động thành công chưa (Health Check).
    *   Nếu phiên bản mới chạy ổn định, hệ thống mới chuyển hướng người dùng sang bản mới và tắt bản cũ đi.
    *   Nếu phiên bản mới bị lỗi (crash, thiếu file...), hệ thống sẽ tự động xóa bản lỗi đi và giữ nguyên trang web cũ đang chạy để tránh làm sập web của người dùng.
*   **Lợi ích:** Người dùng truy cập trang web không bao giờ gặp lỗi gián đoạn hoặc sập web trong quá trình cập nhật phiên bản mới.

### 2. Tự động co giãn & thu hồi tài nguyên (Auto-scaling & Resource Reclaiming)
*   **Cách hoạt động:** 
    *   Hệ thống có một tiến trình chạy ngầm để giám sát mức độ sử dụng CPU/RAM của các ứng dụng.
    *   Nếu ứng dụng bị quá tải (CPU > 80%), hệ thống tự động nâng thêm giới hạn RAM và CPU cho ứng dụng đó để tránh bị đơ hoặc sập ứng dụng.
    *   Nếu ứng dụng nhàn rỗi ít người dùng (CPU < 15%), hệ thống sẽ tự động giảm giới hạn RAM/CPU xuống mức tối thiểu (256MB RAM) để trả lại tài nguyên trống cho máy chủ.
    *   Quá trình co giãn này diễn ra trực tiếp khi ứng dụng đang chạy mà **không cần khởi động lại** ứng dụng.
*   **Lợi ích:** Tránh sập web do quá tải và giúp tiết kiệm tối đa tài nguyên phần cứng cho máy chủ.

### 3. Giao diện chạy lệnh SQL bảo mật trong môi trường cô lập (SQL Query Runner)
*   **Cách hoạt động:** 
    *   Cho phép lập trình viên gõ lệnh SQL trực tiếp trên giao diện web để truy vấn dữ liệu từ MySQL/PostgreSQL của họ.
    *   Thay vì kết nối trực tiếp từ server backend (dễ bị hack SQL Injection), hệ thống ghi câu lệnh SQL ra một file tạm, đẩy file này vào sâu bên trong container database và chạy bằng công cụ CLI nội bộ của database đó, sau đó lấy kết quả trả về giao diện.
*   **Lợi ích:** Tiện lợi cho việc quản lý dữ liệu nhanh chóng mà vẫn đảm bảo an toàn bảo mật tuyệt đối cho cơ sở dữ liệu.

### 4. WebSocket Rooms truyền dữ liệu thời gian thực tối ưu (Real-time Metrics)
*   **Cách hoạt động:** 
    *   Giao diện web hiển thị biểu đồ CPU/RAM thời gian thực của ứng dụng.
    *   Để tránh việc nhiều người cùng xem biểu đồ làm nghẽn máy chủ (do mỗi người gửi một yêu cầu truy cập Docker API liên tục), hệ thống sẽ gom tất cả những người đang xem chung một dự án vào một "phòng" WebSocket.
    *   Backend chỉ truy vấn Docker API đúng 1 lần duy nhất cho mỗi phòng rồi phát sóng kết quả cho toàn bộ mọi người trong phòng đó. Khi không có ai xem, hệ thống sẽ dừng hoàn toàn việc truy vấn để tiết kiệm CPU.
*   **Lợi ích:** Giúp hệ thống hoạt động mượt mà, không bị lag kể cả khi có hàng chục người cùng xem giám sát.

---

## 🛠️ PHẦN 2: CÁC TÍNH NĂNG CƠ BẢN CỦA NỀN TẢNG
*Các tính năng cơ bản cấu thành nên một hệ thống quản lý hoàn chỉnh.*

### 2.1. Phân hệ Quản lý Dự án & Triển khai (Deploy App)
*   **Tự động tạo Dockerfile:** Quét mã nguồn dự án tự động để nhận diện ngôn ngữ (NodeJS, PHP/Laravel, Python, HTML tĩnh) và tự sinh file cấu hình Dockerfile tương ứng nếu dự án không có sẵn.
*   **Cấp phát cổng tránh xung đột:** Hệ thống tự gán cổng ngẫu nhiên cho ứng dụng và kiểm tra qua 3 lớp (kiểm tra trong Database, kiểm tra các container đang chạy và tạo cổng ảo kiểm tra thực tế trên máy chủ) để đảm bảo không bị lỗi trùng cổng.
*   **Tự dọn dẹp ổ đĩa (Garbage Collection):** Sau khi deploy bản mới thành công, hệ thống tự động xóa các bản build cũ và các file rác để tránh làm đầy dung lượng ổ cứng của máy chủ.
*   **Nút Rollback nhanh:** Trong phần lịch sử deploy, người dùng có thể bấm nút "Rollback" bên cạnh bản cũ để chuyển ngay lập tức trang web đang chạy về phiên bản đó.
*   **Volume Mapping & Discord Webhook (Cài đặt nâng cao):**
    *   *Volume Mapping:* Gắn thư mục của máy chủ vào container để lưu file hình ảnh/dữ liệu dài hạn (không bị mất khi deploy lại app).
    *   *Discord Webhook:* Nhập link webhook của Discord để hệ thống tự động gửi tin nhắn báo khi deploy thành công hoặc gặp lỗi.
*   **Tự động tạo SSL:** Tạo chứng chỉ SSL bảo mật HTTPS cho các ứng dụng chạy trên local.

### 2.2. Phân hệ Quản lý Cơ sở dữ liệu (Database-as-a-Service)
*   **Tạo nhanh Database:** Tạo cơ sở dữ liệu MySQL, PostgreSQL, Redis, MongoDB chỉ với 1 click chuột kèm cấp tài khoản và chuỗi kết nối tự động.
*   **Tự động đồng bộ trạng thái thực tế (Lazy Sync):** Nếu người dùng lỡ xóa database trực tiếp bằng Docker Desktop hoặc dòng lệnh ngoài hệ thống, trang web sẽ tự phát hiện và cập nhật trạng thái database thành "Đã dừng" khi tải lại trang.
*   **Sao lưu tự động & Xoay vòng (Backup):** Hệ thống tự động backup dữ liệu vào nửa đêm hàng ngày hoặc người dùng bấm nút backup thủ công. Hệ thống chỉ giữ lại tối đa 5 bản backup mới nhất để tiết kiệm bộ nhớ.

### 2.3. Phân hệ Giám sát & Nhật ký (Monitor & Logs)
*   **Xem log ứng dụng thời gian thực:** Stream log lỗi và thông tin chạy từ container Docker lên màn hình console giả lập trên web qua WebSocket.
*   **Trang giám sát máy chủ cho Admin:** Trang riêng dành cho tài khoản Admin để theo dõi sức khỏe tổng quan của máy chủ (CPU, RAM, dung lượng ổ cứng, thời gian máy chủ đã chạy).

### 2.4. Phân hệ Bảo mật & Tài khoản
*   **Phân quyền vai trò (RBAC):** Tài khoản Admin xem được toàn bộ thông số máy chủ và quản lý hệ thống, tài khoản lập trình viên thông thường chỉ xem được dự án của mình.
*   **Mã hóa mật khẩu và biến môi trường:** Các thông tin nhạy cảm (như mật khẩu DB, API Key) được mã hóa bằng thuật toán AES-256-GCM trong database và chỉ được giải mã khi ứng dụng khởi chạy.

---

## 🏗️ PHẦN 3: CÔNG NGHỆ CHỦ ĐẠO SỬ DỤNG
*   **Frontend (Giao diện):** Next.js 16, TailwindCSS 4, Framer Motion (hiệu ứng mượt mà), Socket.io-client.
*   **Backend (Xử lý hệ thống):** NestJS, Docker Engine SDK (giao tiếp với Docker), Prisma ORM, Socket.io (WebSocket server).
*   **Cơ sở dữ liệu lưu trữ cấu hình:** PostgreSQL.
*   **Bộ điều tuyến:** Nginx Reverse Proxy (điều hướng subdomain và cấu hình SSL).
