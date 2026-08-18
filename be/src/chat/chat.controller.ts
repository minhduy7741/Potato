import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleChat(
    @Body('message') message: string,
    @Body('history') history: any[] = []
  ) {
    if (!message) {
      return { answer: 'Vui lòng nhập câu hỏi.' };
    }
    const answer = await this.chatService.processMessage(message, history);
    return { answer };
  }
}
