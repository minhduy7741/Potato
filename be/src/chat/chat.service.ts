import { Injectable, Logger } from '@nestjs/common';
import { SystemService } from '../system/system.service';
import Groq from 'groq-sdk';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private groq: Groq;
  private cache = new Map<string, string>();

  constructor(private readonly systemService: SystemService) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.groq = new Groq({ apiKey });
      this.logger.log('Groq AI initialized.');
    } else {
      this.logger.warn('GEMINI_API_KEY is not set. Chatbot will return fallback responses.');
    }
  }

  private normalizeKey(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[.,!?]/g, '')
      .replace(/\s+/g, ' ');
  }

  async processMessage(message: string, history: any[] = []): Promise<string> {
    const cacheKey = this.normalizeKey(message);

    if (this.cache.has(cacheKey)) {
      this.logger.log(`[CACHE HIT] Phản hồi từ Cache cho câu hỏi: "${message}"`);
      return this.cache.get(cacheKey)!;
    }

    if (!this.groq) {
      return 'Hệ thống AI hiện đang được bảo trì hoặc chưa cấu hình API Key. Vui lòng quay lại sau!';
    }

    try {
      const config = await this.systemService.getConfig();
      if (!config.isChatbotEnabled) {
        return 'Chatbot hiện đang bị vô hiệu hóa bởi Admin.';
      }

      this.logger.log(`[API CALL] Gọi Groq AI cho câu hỏi: "${message}"`);

      const messages: any[] = [
        { role: 'system', content: config.chatbotSystemPrompt }
      ];

      for (const h of history) {
        messages.push({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: h.content
        });
      }

      messages.push({ role: 'user', content: message });

      const completion = await this.groq.chat.completions.create({
        messages,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 2000,
      });

      const answer = completion.choices[0]?.message?.content || '';

      if (!answer) {
         throw new Error("Không nhận được câu trả lời từ máy chủ.");
      }

      if (message.length > 5) {
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
