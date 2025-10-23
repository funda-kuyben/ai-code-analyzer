import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();


@Injectable()
export class AuthService {
  async getGithubToken(code: string) { //GitHub’dan token alma
    const response = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: 'application/json' } },
    );

    if (!response.data.access_token) {
      throw new Error('GitHub token alınamadı.');
    }

    return response.data.access_token;
  }

  async getGithubUser(token: string) {
    const response = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `token ${token}` },
    });
    return response.data;
  }
}
