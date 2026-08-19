import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    // Chỉ khởi tạo nếu có cấu hình SMTP
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      this.logger.log(`SMTP Mailer initialized with user: ${process.env.SMTP_USER}`);
    } else {
      this.logger.warn('No SMTP configuration found. Emails will only be logged to console.');
    }
  }

  async sendPasswordResetEmail(to: string, token: string) {
    // [GIẢI THÍCH LUỒNG: BƯỚC 1 - CHUẨN BỊ LINK KHÔI PHỤC]
    // Lấy tên miền của Frontend (mặc định localhost:3000) và nối token bảo mật vào.
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;
    
    // [GIẢI THÍCH LUỒNG: BƯỚC 2 - THIẾT KẾ TEMPLATE EMAIL]
    // Sử dụng HTML CSS thuần để tạo form email đẹp mắt.
    const mailOptions = {
      from: `"Potato PaaS" <${process.env.SMTP_USER || 'noreply@potato.local'}>`,
      to: to,
      subject: 'Yêu cầu đặt lại mật khẩu - Potato PaaS',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #3b82f6;">Potato PaaS</h2>
          <p>Chào bạn,</p>
          <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với địa chỉ email này.</p>
          <p>Vui lòng click vào nút bên dưới để tạo mật khẩu mới. Link này sẽ hết hạn trong vòng 15 phút.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Đặt Lại Mật Khẩu
            </a>
          </div>
          <p>Nếu bạn không thể click vào nút trên, hãy copy và dán đường link này vào trình duyệt:</p>
          <p style="word-break: break-all; color: #64748b; font-size: 14px;">${resetLink}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">Nếu bạn không yêu cầu đổi mật khẩu, vui lòng bỏ qua email này.</p>
        </div>
      `,
    };

    // [GIẢI THÍCH LUỒNG: BƯỚC 3 - THỰC THI GỬI MAIL]
    if (this.transporter) {
      try {
        await this.transporter.sendMail(mailOptions);
        this.logger.log(`Password reset email sent to ${to}`);
      } catch (error: any) {
        this.logger.error(`Failed to send email to ${to}: ${error.message}`);
        throw new Error('Không thể gửi email. Vui lòng thử lại sau.');
      }
    } else {
      // [GIẢI THÍCH LUỒNG: BƯỚC DỰ PHÒNG (DEV MODE)]
      // Nếu Admin chưa cấu hình tài khoản SMTP, hệ thống sẽ không lỗi mà chỉ in đường link ra Console.
      // Tiện lợi cho việc test ở môi trường local (chỉ việc copy từ màn hình console).
      this.logger.debug(`[DEV MODE] Password reset link for ${to}: ${resetLink}`);
    }
  }
}
