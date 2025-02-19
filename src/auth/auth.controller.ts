import { Controller, Post, Body, ParseIntPipe, Get } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Endpoint for user registration
  @Post('register')
  async register(@Body('email') email: string) {
    return this.authService.register(email);
  }

  // Endpoint for validating the 6-digit TOTP code
  @Post('verify')
  async verify(
    @Body('userId', ParseIntPipe) userId: number,
    @Body('token') token: string,
  ) {
    const valid = await this.authService.verifyCode(userId, token);
    return { valid };
  }

  @Get('users')
  async getAllUsers() {
    return { users: await this.authService.getAllUsers() };
  }
}
