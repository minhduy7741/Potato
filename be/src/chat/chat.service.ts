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

    // [GIẢI THÍCH LUỒNG: BƯỚC 1 - KIỂM TRA BỘ NHỚ ĐỆM (CACHE HIT)]
    // Nhằm tiết kiệm chi phí gọi API Google Gemini và tăng tốc độ trả lời, 
    // hệ thống sẽ lưu lại câu trả lời vào RAM (Map object). 
    // Nếu câu hỏi trùng với câu hỏi đã hỏi trước đó, sẽ lấy ngay từ bộ nhớ đệm ra trả lời.
    if (this.cache.has(cacheKey)) {
      this.logger.log(`[CACHE HIT] Phản hồi từ Cache cho câu hỏi: "${message}"`);
      return this.cache.get(cacheKey)!;
    }

    // [GIẢI THÍCH LUỒNG: BƯỚC 2 - KIỂM TRA ĐIỀU KIỆN]
    // Nếu lập trình viên không cung cấp GEMINI_API_KEY trong file .env, 
    // Chatbot sẽ trả về một câu thông báo thay vì sập hệ thống.
    if (!this.genAI) {
      return 'Hệ thống AI hiện đang được bảo trì hoặc chưa cấu hình API Key. Vui lòng quay lại sau!';
    }

    try {
      this.logger.log(`[API CALL] Gọi Google Gemini cho câu hỏi: "${message}"`);
      
      const config = await this.systemService.getConfig();
      if (!config.isChatbotEnabled) {
        return 'Chatbot hiện đang bị vô hiệu hóa bởi Admin.';
      }

      // [GIẢI THÍCH LUỒNG: BƯỚC 3 - KHỞI TẠO MODEL VÀ GÁN PROMPT GỐC]
      // Lấy cấu hình System Prompt từ Database (được Admin thiết lập trong phần System Settings)
      // Để ra lệnh cho AI đóng vai chuyên gia hỗ trợ của nền tảng Potato.
      // (Khởi tạo bên dưới vòng lặp)

      // [GIẢI THÍCH LUỒNG: BƯỚC 4 - DỊCH LỊCH SỬ CHAT]
      // Chuyển đổi định dạng history của giao diện (Frontend) sang định dạng chuẩn mà Gemini API yêu cầu.
      // Frontend truyền: [{role: 'user', content: '...'}, {role: 'bot', content: '...'}]
      // Gemini cần: [{role: 'user', parts: [{text: '...'}]}, {role: 'model', parts: [{text: '...'}]}]
      const formattedHistory = history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }]
      }));

      // Thử gọi các Model khác nhau nếu bị lỗi 404 (Google đã xóa các model cũ, nâng cấp lên 2.5 và 3.5)
      const modelsToTry = [
        'gemini-2.5-flash', 
        'gemini-flash-latest', 
        'gemini-3.5-flash', 
        'gemini-pro-latest'
      ];
      let answer = '';
      let chatSession;

      for (const modelName of modelsToTry) {
        try {
          const model = this.genAI.getGenerativeModel({ 
            model: modelName,
            systemInstruction: config.chatbotSystemPrompt
          });

          // [GIẢI THÍCH LUỒNG: BƯỚC 5 - TẠO PHIÊN CHAT & GỬI]
          chatSession = model.startChat({
            history: formattedHistory,
            generationConfig: {
              maxOutputTokens: 2000,
              temperature: 0.7, // Nhiệt độ 0.7 giúp câu trả lời tự nhiên, thân thiện nhưng vẫn chính xác
            },
          });

          const result = await chatSession.sendMessage(message);
          answer = result.response.text();
          break; // Thành công thì thoát vòng lặp
        } catch (err: any) {
          const errMsg = err.message || '';
          // Nếu model không tồn tại (404) hoặc máy chủ Google đang quá tải (503, 529) thì thử model tiếp theo
          if (errMsg.includes('404 Not Found') || errMsg.includes('503 Service Unavailable') || errMsg.includes('529')) {
            this.logger.warn(`Model ${modelName} đang lỗi/quá tải, tự động nhảy sang model tiếp theo...`);
            continue; // Thử model tiếp theo
          }
          throw err; // Ném lỗi nếu bị các lỗi nghiêm trọng như 400 Bad Request, 403 Forbidden
        }
      }

      if (!answer) {
         throw new Error("Tất cả các Model AI đều không khả dụng hoặc đang bị Google quá tải.");
      }

      // [GIẢI THÍCH LUỒNG: BƯỚC 6 - LƯU CACHE (NẾU ĐÁP ÁN ĐỦ NGẮN)]
      // Lưu lại kết quả vào cache để sử dụng cho lần sau.
      // Chỉ cache những câu hỏi dài (có ý nghĩa), tránh cache các câu quá ngắn như "chào", "hi" vì nó phụ thuộc ngữ cảnh.
      if (message.length > 5) {
         // CƠ CHẾ CHỐNG TRÀN RAM (LRU CACHE ĐƠN GIẢN):
         // Nếu Map lưu quá 1000 câu hỏi, ta sẽ xóa đi câu hỏi cũ nhất (được đưa vào đầu tiên)
         // Map trong Javascript có đặc tính nhớ thứ tự chèn (insertion order).
         if (this.cache.size >= 1000) {
           const oldestKey = this.cache.keys().next().value;
           if (oldestKey) {
             this.cache.delete(oldestKey);
           }
         }
         this.cache.set(cacheKey, answer);
      }

      return answer;
    } catch (error: any) {
      this.logger.error(`Lỗi khi gọi Gemini AI: ${error.message}`);
      return 'Xin lỗi, tôi đang gặp sự cố kết nối với trung tâm dữ liệu. Vui lòng thử lại sau ít phút.';
    }
  }
}
