import { Controller, Post, Body, Get, UseGuards, Request, Res,UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() userData: any, @Res() res) {
    try {
      // Register the user
      const user = await this.authService.register(userData);
      
      // Automatically log the user in after registration
      const loginResult = await this.authService.login(user);
      
      // Return both user data and tokens
      return res.status(201).json({
        message: 'User created successfully',
        access_token: loginResult.access_token,
        refresh_token: loginResult.refresh_token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      return res.status(400).json({
        error: error.message || 'Registration failed'
      });
    }
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  async refresh(@Request() req) {
    return this.authService.refreshToken(req.user);
  }
}