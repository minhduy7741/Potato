import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SystemService } from '../system/system.service';
import Groq from 'groq-sdk';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private genAI: GoogleGenerativeAI | null = null;
  private groq: Groq | null = null;
  private cache = new Map<string, string>();

  constructor(private readonly systemService: SystemService) {
    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;
    
    if (geminiKey) {
      this.genAI = new GoogleGenerativeAI(geminiKey);
    }
    if (groqKey) {
      this.groq = new Groq({ apiKey: groqKey });
    }
  }

  // Tiền xử lý câu hỏi để tăng tỷ lệ cache hit
  private normalizeMessage(message: string): string {
    return message
      .toLowerCase()
      .trim()
      .replace(/[?!.]/g, '') 
      .replace(/\s+/g, ' '); 
  }

  async processMessage(message: string, history: Array<{ role: string; content: string }> = []): Promise<string> {
    const normalizedMessage = this.normalizeMessage(message);
    const cacheKey = `${normalizedMessage}_${history.length}`;
    if (this.cache.has(cacheKey)) {
      this.logger.log(`[CACHE HIT] Lấy câu trả lời từ bộ nhớ đệm cho: "${message}"`);
      return this.cache.get(cacheKey)!;
    }

    if (!this.genAI && !this.groq) {
      return 'Hệ thống AI hiện đang bảo trì hoặc chưa cấu hình API Key. Vui lòng quay lại sau!';
    }

    try {
      const config = await this.systemService.getConfig();
      if (!config.isChatbotEnabled) {
        return 'Chatbot hiện đang bị vô hiệu hóa bởi Admin.';
      }

      let answer = '';

      // Tầng 1: Thử gọi Google Gemini trước (Nếu có cấu hình)
      if (this.genAI) {
        this.logger.log(`[API CALL] Gọi Google Gemini cho câu hỏi: "${message}"`);
        const formattedHistory = history.map(h => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.content }]
        }));

        const modelsToTry = [
          'gemini-2.5-flash', 
          'gemini-flash-latest', 
          'gemini-3.5-flash', 
          'gemini-pro-latest'
        ];
        
        let chatSession;

        for (const modelName of modelsToTry) {
          try {
            const model = this.genAI.getGenerativeModel({ 
              model: modelName,
              systemInstruction: config.chatbotSystemPrompt
            });

            chatSession = model.startChat({
              history: formattedHistory,
              generationConfig: {
                maxOutputTokens: 2000,
                temperature: 0.7,
              },
            });

            const result = await chatSession.sendMessage(message);
            answer = result.response.text();
            if (answer) break; // Thành công thì thoát vòng lặp
          } catch (err: any) {
            const errMsg = err.message || '';
            if (errMsg.includes('404 Not Found') || errMsg.includes('503 Service Unavailable') || errMsg.includes('529')) {
              this.logger.warn(`Gemini Model ${modelName} đang lỗi/quá tải, nhảy sang model tiếp theo...`);
              continue;
            }
            // Không break ở đây, để nó rơi xuống tầng 2 (Groq) nếu Gemini sập hoàn toàn
            this.logger.warn(`Gemini lỗi nặng: ${errMsg}`);
            break;
          }
        }
      }

      // Tầng 2: Thử gọi Groq nếu Gemini sập hoặc không được cấu hình (Và có cấu hình Groq)
      if (!answer && this.groq) {
        this.logger.warn(`[API CALL] Google Gemini thất bại hoặc thiếu cấu hình. Chuyển sang Groq AI (Llama 3.3)...`);
        
        const messages: any[] = [
          { role: 'system', content: config.chatbotSystemPrompt }
        ];
        for (const msg of history) {
          messages.push({
            role: msg.role === 'bot' ? 'assistant' : 'user',
            content: msg.content
          });
        }
        messages.push({ role: 'user', content: message });

        try {
          const completion = await this.groq.chat.completions.create({
            messages,
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7,
            max_tokens: 2000,
          });
          answer = completion.choices[0]?.message?.content || '';
        } catch (err: any) {
          this.logger.error(`Lỗi khi gọi Groq AI: ${err.message}`);
        }
      }

      // Nếu cả 2 đều sập
      if (!answer) {
         throw new Error("Tất cả các hệ thống AI (Gemini & Groq) đều đang sập hoặc quá tải.");
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
