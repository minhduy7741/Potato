# Hướng dẫn Chạy Dự án Potato (IDP)

Tài liệu này hướng dẫn bạn cách khởi động toàn bộ dự án Potato trên máy cục bộ.

> [!IMPORTANT]
> **Yêu cầu**: Bạn phải cài đặt và đang chạy **Docker Desktop**.

---

## Bước 1: Khởi động Database (Backend)

Mở terminal tại thư mục `be/` và chạy lệnh sau để khởi động PostgreSQL container:

```bash
cd be
docker-compose up -d
```

## Bước 2: Cài đặt Backend & Prisma

Tiếp theo, bạn cần cài đặt các thư viện và thiết lập Database Schema:

```bash
# Vẫn đang ở thư mục be/
npm install
npx prisma db push
```

## Bước 3: Chạy Backend Server

Khởi động backend ở chế độ development:

```bash
npm run start:dev
```
*Backend sẽ chạy tại: `http://localhost:3000` (hoặc cổng cấu hình trong .env)*

---

## Bước 4: Cài đặt & Chạy Frontend

Mở một terminal mới tại thư mục gốc của dự án, sau đó thực hiện:

```bash
cd fe
npm install
npm run dev
```
*Frontend sẽ chạy tại: `http://localhost:3001` (hoặc cổng mặc định của Next.js)*

---

## Tóm tắt các lệnh nhanh:

| Thành phần | Lệnh thực hiện |
| :--- | :--- |
| **Database** | `cd be && docker-compose up -d` |
| **Backend** | `cd be && npm install && npx prisma db push && npm run start:dev` |npx prisma studio

| **Frontend** | `cd fe && npm install && npm run dev` |
Email: user@potato.com
Mật khẩu: userpassword