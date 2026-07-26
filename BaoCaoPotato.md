# Chương 1. GIỚI THIỆU

## 1.1 ĐẶT VẤN ĐỀ

Trong kỷ nguyên công nghệ thông tin và chuyển đổi số, việc tối ưu hóa quy trình phát triển và vận hành phần mềm (DevOps) đã trở thành một yếu tố sống còn đối với sự phát triển bền vững của doanh nghiệp. Xu hướng dịch chuyển từ các hệ thống máy chủ vật lý cồng kềnh sang kiến trúc container hóa (Containerization) và điện toán đám mây (Cloud Computing) đòi hỏi các kỹ sư phần mềm phải liên tục cập nhật và làm chủ các công nghệ quản trị hạ tầng. Tuy nhiên, việc vận hành các môi trường này theo cách truyền thống thường bộc lộ nhiều điểm hạn chế, tạo nên "nút thắt cổ chai" (bottleneck) trong chuỗi cung ứng phần mềm.

Thông thường, nhà phát triển ứng dụng (Developer) phải tập trung tối đa thời gian vào việc hiện thực hóa các logic nghiệp vụ (business logic) của phần mềm. Tuy nhiên, khi muốn đưa ứng dụng lên chạy thử nghiệm hoặc chạy chính thức, họ lại phải gánh chịu một lượng "áp lực nhận thức" (cognitive load) rất lớn khi phải tự tay thiết lập Dockerfile, cấu hình Reverse Proxy (Nginx, Traefik), cài đặt và gia hạn chứng chỉ bảo mật SSL/TLS, cấu hình biến môi trường, khởi tạo các kết nối cơ sở dữ liệu, và thiết lập các kịch bản sao lưu dữ liệu. Những tác vụ này không chỉ đòi hỏi kiến thức chuyên sâu về hệ thống mạng mà còn rất dễ xảy ra lỗi nếu thực hiện thủ công.

Hệ quả là quy trình triển khai phần mềm bị kéo dài. Lập trình viên phải tạo yêu cầu cấp phát tài nguyên (ticket) gửi đến đội ngũ vận hành hệ thống (SysAdmin/DevOps), và quá trình phê duyệt thường mất nhiều thời gian. Hơn nữa, việc thiếu các công cụ giám sát trực quan khiến doanh nghiệp gặp khó khăn trong việc theo dõi sức khỏe của ứng dụng, dễ dẫn đến tình trạng quá tải RAM/CPU hoặc cạn kiệt dung lượng đĩa cứng mà không được phát hiện kịp thời.

Từ những thách thức đó, mô hình **Nền tảng phát triển nội bộ (Internal Developer Platform - IDP)** ra đời như một giải pháp cứu cánh. IDP cung cấp một cổng tự phục vụ (Self-service Portal) giúp trừu tượng hóa toàn bộ sự phức tạp của hạ tầng mạng bên dưới. Nhà phát triển có thể tự tay tạo môi trường chạy ứng dụng, liên kết cơ sở dữ liệu, và thiết lập cảnh báo tài nguyên chỉ trong vài giây.

Đề tài **"Xây dựng nền tảng phát triển nội bộ Potato"** tập trung vào việc thiết kế và hiện thực hóa một hệ thống IDP trực quan, gọn nhẹ và có khả năng tự động hóa cao. Với thông điệp *"gieo mầm dự án dễ dàng như trồng khoai tây"*, Potato IDP hỗ trợ lập trình viên triển khai ứng dụng từ mã nguồn Git, quản lý giới hạn tài nguyên container (RAM/CPU Limit), tự động co giãn tài nguyên (Auto-scaling), thiết lập cảnh báo tài nguyên thời gian thực qua Slack Webhook với chu kỳ tùy chỉnh (alertInterval), và tự động cấp phát cơ sở dữ liệu (Sprout). Hệ thống này giúp giảm tải áp lực cho đội ngũ vận hành, tối ưu hóa hiệu suất phần cứng máy chủ, và đẩy nhanh tiến độ bàn giao sản phẩm của doanh nghiệp.

---

## 1.2 NHỮNG THỬ THÁCH CẦN GIẢI QUYẾT

Để xây dựng một nền tảng Potato IDP hoạt động trơn tru và an toàn, hệ thống phải giải quyết triệt để các thách thức kỹ thuật cốt lõi sau:

- **Quản lý vòng đời Container ảo hóa:** Tích hợp sâu với Docker Engine API để tự động hóa các thao tác tạo mới, khởi động, dừng, khởi động lại và xóa container từ xa một cách an toàn mà không làm ảnh hưởng đến các container khác trên hệ thống.
- **Định tuyến cổng mạng động (Dynamic Port Mapping):** Tự động phát hiện cổng trống trên máy chủ Host để ánh xạ với container, tránh hiện tượng trùng lặp và xung đột cổng mạng khi chạy hàng chục ứng dụng song song.
- **Thu thập thông số tài nguyên thời gian thực:** Xây dựng dịch vụ chạy ngầm (daemon service) để lấy mẫu hiệu năng (CPU usage, RAM usage) của từng container và máy chủ Host với tần suất cao (1 phút/lần) nhưng phải đảm bảo tiêu tốn cực ít tài nguyên hệ thống.
- **Cơ chế tự động co giãn tài nguyên (Auto-scaling):** Thiết kế thuật toán tự động nhận biết khi container quá tải để nâng cấp giới hạn CPU/RAM (Scale Up) và hạ cấp (Scale Down) khi tải giảm để giải phóng tài nguyên.
- **Khắc phục lỗi truyền tải payload Slack bằng Tiếng Việt:** Xử lý triệt để lỗi `invalid_payload` từ Slack API bằng cách tính toán chính xác Content-Length theo byte của buffer UTF-8 thay vì sử dụng độ dài ký tự chuỗi JavaScript thông thường.
- **Cấp phát Cơ sở dữ liệu theo nhu cầu (Sprout):** Khởi tạo nhanh chóng các instance PostgreSQL, MySQL, Redis, MongoDB độc lập và bảo mật, tự động sinh mật khẩu phức tạp và xuất chuỗi kết nối (Connection String) chuẩn hóa.
- **Stream logs trực tiếp qua WebSocket:** Đồng bộ hóa logs xuất ra từ container Docker để truyền phát trực tiếp (stream) lên trình duyệt của lập trình viên thông qua WebSocket với độ trễ tối thiểu.

---

## 1.3 NỘI DUNG, PHẠM VI THỰC HIỆN

Hệ thống Potato IDP cung cấp các chức năng khác nhau tùy thuộc vào vai trò của người sử dụng. Dưới đây là mô tả chi tiết từng chức năng được thiết kế theo phân quyền hệ thống:

### 1.3.1 Quản trị viên hệ thống (Admin)
Quản trị viên hệ thống là người chịu trách nhiệm giám sát và bảo đảm sự ổn định của toàn bộ cụm máy chủ Host vật lý và nền tảng Potato.

#### 1.3.1.1 Đăng nhập
Quản trị viên sử dụng tài khoản Admin được cấp sẵn (đăng nhập bằng Email và Mật khẩu đã được mã hóa Bcrypt trong database) để truy cập vào trang Dashboard đặc quyền của Admin.

#### 1.3.1.2 Giám sát tài nguyên máy chủ Host
Hệ thống cung cấp giao diện trực quan hiển thị các chỉ số tài nguyên thực tế của máy chủ vật lý đang chạy hệ thống bao gồm:
- **Tải CPU vật lý:** Hiển thị model CPU, số luồng xử lý, tải trung bình (load average) của hệ thống trong 1 phút và 5 phút gần nhất, và phần trăm sử dụng CPU.
- **Bộ nhớ RAM vật lý:** Hiển thị tổng dung lượng RAM của Host, dung lượng RAM đang sử dụng (GB), dung lượng RAM còn trống (GB) và tỷ lệ sử dụng hiện tại.
- **Dung lượng đĩa cứng (Disk Space):** Thống kê dung lượng ổ đĩa của Host, kèm theo cảnh báo đổi màu sang màu đỏ (Danger) khi dung lượng đĩa đã sử dụng vượt quá 75% để Admin kịp thời giải phóng dung lượng.
- **Thời gian hoạt động liên tục (Host Uptime):** Hiển thị chi tiết số ngày, số giờ, số phút máy chủ đã chạy liên tục kể từ lần khởi động gần nhất.

#### 1.3.1.3 Thống kê và kiểm soát hoạt động nền tảng
Admin được cung cấp trang thống kê tổng quan hoạt động của hệ thống Potato bao gồm:
- Thống kê tổng số lập trình viên (Developer) đã đăng ký tài khoản trên nền tảng.
- Thống kê tổng số dự án (Plot) đã được gieo mầm trên hệ thống và số lượng dự án đang ở trạng thái chạy (Running).
- Thống kê tổng số cơ sở dữ liệu phụ trợ (Sprout) đã được khởi tạo để phục vụ các dự án.

#### 1.3.1.4 Quản lý tài khoản người dùng
Quản trị viên có quyền xem danh sách toàn bộ các lập trình viên trên hệ thống, kiểm soát hạn mức tài nguyên của từng tài khoản, và có quyền khóa hoặc mở khóa tài khoản người dùng khi phát hiện hành vi lạm dụng tài nguyên máy chủ Host.

---

### 1.3.2 Nhà phát triển ứng dụng (Developer)
Nhà phát triển là người sử dụng trực tiếp các dịch vụ của Potato IDP để triển khai, vận hành và quản lý vòng đời các ứng dụng của mình.

#### 1.3.2.1 Đăng ký tài khoản
Người dùng mới có thể tự tạo tài khoản lập trình viên trên giao diện Đăng ký bằng cách cung cấp Họ tên hiển thị, địa chỉ Email hợp lệ và thiết lập mật khẩu bảo mật (tối thiểu 6 ký tự).

#### 1.3.2.2 Đăng nhập hệ thống
Sau khi đăng ký thành công, lập trình viên đăng nhập vào hệ thống bằng Email và Mật khẩu để bắt đầu sử dụng không gian làm việc cá nhân (Workspace).

#### 1.3.2.3 Quản lý thông tin cá nhân
Nhà phát triển có thể thay đổi tên hiển thị, cập nhật ảnh đại diện và thực hiện đổi mật khẩu bảo mật trực tiếp tại trang Cài đặt tài khoản.

#### 1.3.2.4 Gieo mầm dự án (Plant New Plot)
Lập trình viên có thể tạo mới một dự án (Plot) bằng cách đặt tên dự án và định nghĩa tên miền phụ (subdomain) mong muốn. Mỗi dự án được tạo ra sẽ tương ứng với một container Docker độc lập trên máy chủ. Lập trình viên cũng có thể chọn chính sách tự khởi động lại (Restart Policy) cho container của Plot bao gồm:
- `no`: Không tự khởi động lại khi ứng dụng bị crash.
- `on-failure`: Chỉ tự khởi động lại khi ứng dụng thoát với mã lỗi khác 0.
- `always`: Luôn luôn khởi động lại container bất kể nguyên nhân dừng.

#### 1.3.2.5 Triển khai mã nguồn từ nguồn Git
Lập trình viên cấu hình thông tin kho chứa Git (Git Repository URL), nhánh triển khai (Deploy Branch - mặc định là `main`) và Token truy cập nếu là kho chứa riêng tư (Private Repo). Hệ thống hỗ trợ kéo mã nguồn và tiến hành deploy tự động.

#### 1.3.2.6 Cấu hình tài nguyên container
Lập trình viên có thể tự do tùy chỉnh giới hạn tài nguyên cứng cấp phát cho container ứng dụng của mình:
- **Giới hạn RAM:** Lựa chọn dung lượng RAM từ 128MB đến tối đa 2GB.
- **Giới hạn CPU:** Lựa chọn giới hạn CPU từ 0.25 Cores đến tối đa 4 Cores.
- **Cấu hình Auto-scale:** Bật hoặc tắt tính năng tự co giãn tài nguyên. Khi được bật, hệ thống sẽ tự động nâng hạn mức RAM/CPU khi container tiệm cận ngưỡng quá tải.

#### 1.3.2.7 Cấu hình Slack Webhook và khoảng thời gian cảnh báo
- **Cài đặt Slack Webhook:** Lập trình viên nhập liên kết Slack Webhook URL của kênh chat dự án để nhận thông báo tự động.
- **Nút gửi tin nhắn thử:** Nút bấm "Gửi tin nhắn thử" trên giao diện giúp lập trình viên kiểm tra ngay lập tức xem Slack Webhook hoạt động đúng hay không bằng cách bắn một gói tin mẫu dạng UTF-8 lên kênh Slack.
- **Tùy chỉnh khoảng thời gian cảnh báo (alertInterval):** Người dùng có thể điều chỉnh chu kỳ kiểm tra tài nguyên (tính bằng phút, mặc định là 5 phút) để hệ thống đưa ra các cảnh báo quá tải hoặc khôi phục một cách hợp lý.

#### 1.3.2.8 Quản lý biến môi trường và Secret
Lập trình viên có thể quản lý các biến cấu hình chạy của ứng dụng thông qua giao diện quản lý biến môi trường.

##### 1.3.2.8.1 Thêm, chỉnh sửa biến môi trường
Nhà phát triển có thể thêm mới, sửa hoặc xóa các cặp khóa-giá trị (Key-Value) cần thiết cho ứng dụng khi chạy (như `PORT`, `NODE_ENV`, `API_KEY`).

##### 1.3.2.8.2 Mã hóa và ẩn thông tin nhạy cảm
Hỗ trợ tích chọn thuộc tính `Secret` cho các biến nhạy cảm (như mật khẩu DB, khóa API). Khi được kích hoạt, giá trị của biến sẽ được ẩn đi trên giao diện UI và được mã hóa lưu trữ ở cơ sở dữ liệu để tránh lộ lọt thông tin.

#### 1.3.2.9 Quản lý cơ sở dữ liệu phụ trợ (Sprout Service)
Nhà phát triển có thể tự khởi tạo nhanh các container cơ sở dữ liệu phụ trợ (PostgreSQL, MySQL, Redis, MongoDB) chạy cô lập trên hệ thống Potato. Hệ thống sẽ tự động cấp phát tài khoản, mật khẩu ngẫu nhiên và hiển thị chuỗi kết nối (Connection String) để lập trình viên copy và cấu hình vào ứng dụng của mình.

#### 1.3.2.10 Giám sát trạng thái và xem logs trực tiếp qua WebSocket
- Lập trình viên có thể bật (Start), tắt (Stop) hoặc khởi động lại (Restart) container của ứng dụng trực tiếp bằng các nút bấm trên giao diện điều khiển.
- Cung cấp màn hình Live Logs giả lập Terminal, tự động cập nhật và cuộn liên tục các dòng logs hệ thống thời gian thực thu thập từ container Docker qua giao thức WebSocket (Socket.IO).

---

## 1.4 KẾT QUẢ CẦN ĐẠT

Để đề tài được đánh giá là hoàn thiện và đạt chất lượng cao, hệ thống Potato IDP sau khi xây dựng xong cần đạt được các kết quả cụ thể và có thể đo lường được như sau:

- **Giao diện Cổng dịch vụ tự phục vụ hoàn chỉnh:** Giao diện web Responsive hoàn toàn bằng tiếng Việt, thiết kế hiện đại, bố cục rõ ràng từ trang chủ Dashboard, trang quản lý dự án, trang tài liệu hướng dẫn đến trang cài đặt tài khoản.
- **Hệ thống tự động hóa hạ tầng container:** Triển khai container hóa ứng dụng tự động dưới 30 giây kể từ khi bấm deploy, định tuyến cổng mạng và ánh xạ tên miền phụ động hoạt động ổn định.
- **Dịch vụ giám sát chạy ngầm hoạt động chính xác:** Tiến trình thu thập tài nguyên (Stats Collector Service) chạy ổn định liên tục 24/7 với chu kỳ lấy mẫu 1 phút/lần, không gây rò rỉ bộ nhớ hoặc treo hệ thống Host.
- **Kênh thông báo Slack hoạt động tin cậy:** Gửi tin nhắn định dạng đẹp, đầy đủ tiếng Việt có dấu khi có sự cố quá tải tài nguyên kéo dài quá chu kỳ `alertInterval`, thông báo khôi phục (Recovery) hoặc thông báo sự kiện Auto-scaling thành công.
- **Kênh truyền phát logs WebSocket độ trễ thấp:** Live Logs hoạt động mượt mà, hiển thị đầy đủ logs stdout/stderr từ Docker container với độ trễ truyền tải dưới 200ms.
- **Quản lý cơ sở dữ liệu (Sprout) tự phục vụ:** Khởi tạo thành công 4 loại cơ sở dữ liệu phổ biến PostgreSQL, MySQL, Redis, MongoDB trong vòng 10 giây kèm theo chuỗi kết nối chính xác.
