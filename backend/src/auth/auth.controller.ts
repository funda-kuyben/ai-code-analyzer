import { Controller, Get, Query, Res, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SessionService } from '../session/session.service';
import type { Response } from 'express';
import * as dotenv from 'dotenv';
dotenv.config();

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  @Get('github/login')
  githubLogin(@Res() res: Response) {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = encodeURIComponent('http://localhost:4000/auth/github/callback');
    const scope = encodeURIComponent('repo read:user read:org');


    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&prompt=login`;

    res.redirect(url);
  }

  @Get('github/callback')
  async githubCallback(@Query('code') code: string, @Res() res: Response) {
    const token = await this.authService.getGithubToken(code);
    const user = await this.authService.getGithubUser(token);
    const sessionId = await this.sessionService.createSession(token, user.login);
    res.redirect(`http://localhost:3001/?session=${sessionId}`);
  }

  @Post('logout')
  async logout(@Body('sessionId') sessionId: string) {
    await this.sessionService.deleteSession(sessionId);
    return { success: true };
  }
}
