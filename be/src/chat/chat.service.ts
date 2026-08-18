import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class ChatService {
  private genAI: GoogleGenerativeAI | null = null;
  private readonly logger = new Logger(ChatService.name);
  
  // Bộ nhớ đệm (Cache) để lưu các câu trả lời
  // Key: Câu hỏi đã được chuẩn hóa (chữ thường, bỏ khoảng trắng thừa)
  // Value: Câu trả lời từ AI
  private cache = new Map<string, string>();

  // System Prompt: "Não bộ" và kiến thức của AI
  private readonly systemPrompt = `
Bạn là Potato Bot, trợ lý AI chính thức của Potato PaaS.
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
- Nếu được hỏi về giá cả, hãy nói "Hiện tại Potato PaaS đang hoàn toàn miễn phí trong giai đoạn thử nghiệm".
- Tuyệt đối không trả lời các câu hỏi không liên quan đến lập trình, máy chủ, server, hoặc Potato PaaS. Nếu khách hỏi linh tinh, hãy khéo léo từ chối và hướng họ quay lại chủ đề chính.
`;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.logger.log('Google Gemini AI initialized.');
    } else {
      this.logger.warn('GEMINI_API_KEY is not set. Chatbot will return fallback responses.');
    }
  }

  /**
   * Chuẩn hóa câu hỏi để tạo "Key" cho Cache
   * VD: "Làm sao deploy?" và " làm  sao deploy? " sẽ ra cùng 1 key là "lam sao deploy"
   */
  private normalizeKey(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[.,!?]/g, '') // Bỏ dấu câu cơ bản
      .replace(/\s+/g, ' '); // Rút gọn khoảng trắng
  }

  async processMessage(message: string, history: any[] = []): Promise<string> {
    const cacheKey = this.normalizeKey(message);

    // 1. Kiểm tra Cache trước khi gọi AI
    if (this.cache.has(cacheKey)) {
      this.logger.log(`[CACHE HIT] Phản hồi từ Cache cho câu hỏi: "${message}"`);
      return this.cache.get(cacheKey)!;
    }

    // 2. Nếu không có Cache, kiểm tra xem có API Key chưa
    if (!this.genAI) {
      return 'Hệ thống AI hiện đang được bảo trì hoặc chưa cấu hình API Key. Vui lòng quay lại sau!';
    }

    try {
      this.logger.log(`[API CALL] Gọi Google Gemini cho câu hỏi: "${message}"`);
      
      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        systemInstruction: this.systemPrompt
      });

      // Chuyển đổi định dạng history của client sang định dạng của Gemini
      // Client truyền: [{role: 'user', content: '...'}, {role: 'bot', content: '...'}]
      const formattedHistory = history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }],
      }));

      const chat = model.startChat({
        history: formattedHistory,
      });

      const result = await chat.sendMessage(message);
      const answer = result.response.text();

      // 3. Lưu vào Cache để xài cho lần sau
      // Tránh cache các câu quá ngắn như "chào", "hi" vì nó phụ thuộc ngữ cảnh
      if (message.length > 5) {
         this.cache.set(cacheKey, answer);
      }

      return answer;
    } catch (error: any) {
      this.logger.error(`Lỗi khi gọi Gemini AI: ${error.message}`);
      return 'Xin lỗi, tôi đang gặp sự cố kết nối với trung tâm dữ liệu. Vui lòng thử lại sau ít phút.';
    }
  }
}
