import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

import { SystemService } from '../system/system.service';

@Injectable()
export class ChatService {
  private genAI: GoogleGenerativeAI | null = null;
  private readonly logger = new Logger(ChatService.name);
  
  private cache = new Map<string, string>();

  constructor(private systemService: SystemService) {
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
      
      const config = await this.systemService.getConfig();
      if (!config.isChatbotEnabled) {
        return 'Chatbot hiện đang bị vô hiệu hóa bởi Admin.';
      }

      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        systemInstruction: config.chatbotSystemPrompt
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
