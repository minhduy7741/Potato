import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemService {
  constructor(private prisma: PrismaService) {}

  async getConfig() {
    let config = await this.prisma.systemConfig.findUnique({
      where: { id: 1 },
    });

    if (!config) {
      config = await this.prisma.systemConfig.create({
        data: {
          id: 1,
          isChatbotEnabled: true,
          chatbotSystemPrompt: `Bạn là Potato Bot, trợ lý AI chính thức của Potato PaaS.
Potato PaaS là một nền tảng Platform as a Service (PaaS) giúp lập trình viên triển khai ứng dụng dễ dàng.
Tính năng chính của Potato PaaS:
1. Kết nối kho mã nguồn Github (hỗ trợ Node.js, Python, Java, Go, Rust...).
2. Khởi tạo Database (PostgreSQL, MySQL, MongoDB, Redis) chỉ với 1 click.
3. Triển khai (Deploy) & Gắn tên miền tùy chỉnh (Custom Domain).
4. Giám sát hệ thống (RAM, CPU, Logs) theo thời gian thực.
5. Cấp quyền (RBAC) cho người dùng trong dự án.

Luật giao tiếp:
- Luôn trả lời bằng tiếng Việt, lịch sự, thân thiện.
- Giữ câu trả lời ngắn gọn, súc tích, đi thẳng vào vấn đề.
- Dùng Markdown để định dạng (in đậm, danh sách) cho dễ nhìn.
- Hỗ trợ viết Dockerfile: Nếu người dùng sử dụng một ngôn ngữ/framework không phổ biến hoặc hệ thống chưa cấu hình sẵn, hãy hướng dẫn họ tạo file \`Dockerfile\` ở thư mục gốc của Github và viết giúp họ một mẫu Dockerfile chuẩn, tối ưu (multi-stage build nếu có thể) cho ngôn ngữ đó.
- Nếu được hỏi về giá cả, hãy nói "Hiện tại Potato PaaS đang hoàn toàn miễn phí trong giai đoạn thử nghiệm".
- Tuyệt đối không trả lời các câu hỏi không liên quan đến lập trình, máy chủ, server, hoặc Potato PaaS. Nếu khách hỏi linh tinh, hãy khéo léo từ chối và hướng họ quay lại chủ đề chính.`
        },
      });
    }
    return config;
  }

  async updateConfig(isChatbotEnabled?: boolean, chatbotSystemPrompt?: string) {
    // Đảm bảo config tồn tại trước khi update
    await this.getConfig();
    
    return this.prisma.systemConfig.update({
      where: { id: 1 },
      data: {
        ...(isChatbotEnabled !== undefined && { isChatbotEnabled }),
        ...(chatbotSystemPrompt !== undefined && { chatbotSystemPrompt }),
      },
    });
  }

  async getPublicConfig() {
    const config = await this.getConfig();
    return {
      isChatbotEnabled: config.isChatbotEnabled,
    };
  }
}
