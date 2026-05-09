import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: number;   // user id
  email: string;
  name: string;
  role: string;
}

/**
 * JwtStrategy — xác thực Bearer token từ header Authorization.
 * Nếu thành công, payload đã giải mã sẽ được gán vào `req.user`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'potato-super-secret-key-change-in-production',
    });
  }

  async validate(payload: JwtPayload) {
    // Dữ liệu trả về ở đây sẽ được gán làm req.user
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  }
}
