import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { SessionService } from '../session/session.service';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class GithubService {
  constructor(private readonly sessionService: SessionService) {}

  async getUser(token: string) {
    const res = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `token ${token}` },
    });
    return res.data;
  }

  async getUserOrgs(token: string) {
    const res = await axios.get('https://api.github.com/user/orgs', {
      headers: { Authorization: `token ${token}` },
    });
    return res.data;
  }

  async getUserRepos(token: string) {
    const res = await axios.get('https://api.github.com/user/repos?per_page=100', {
      headers: { Authorization: `token ${token}` },
    });
    return res.data;
  }

  async getOrgRepos(org: string, token: string) {
    const res = await axios.get(`https://api.github.com/orgs/${org}/repos?per_page=100`, {
      headers: { Authorization: `token ${token}` },
    });
    return res.data;
  }

  async getCommits(owner: string, repo: string, token: string) {
    const res = await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=100`, {
      headers: { Authorization: `token ${token}` },
    });
    return res.data;
  }

  async getCommitDetails(owner: string, repo: string, sha: string, token: string) {
    try {
      const res = await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits/${sha}`, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!res.data.files || res.data.files.length === 0) {
        console.warn(` ${repo}@${sha} commitinde dosya listesi boş. Diff çekiliyor...`);
        const diffRes = await axios.get(
          `https://api.github.com/repos/${owner}/${repo}/commits/${sha}`,
          {
            headers: {
              Authorization: `token ${token}`,
              Accept: 'application/vnd.github.v3.diff',
            },
          },
        );

        if (typeof diffRes.data === 'string') {
          return { files: [{ filename: 'full_diff.patch', patch: diffRes.data }] };
        }
      }

      return res.data;
    } catch (err: any) {
      console.error(`getCommitDetails(${repo}@${sha}) hatası:`, err.response?.status, err.message);
      return { files: [] }; // hata olsa bile analiz devam etsin
    }
  }

  // Diğer session’lı metodlar
  async getUserBySession(sessionId: string) {
    const token = await this.sessionService.getTokenBySession(sessionId);
    if (!token) throw new Error('Invalid session');
    return this.getUser(token);
  }

  async getUserOrgsBySession(sessionId: string) {
    const token = await this.sessionService.getTokenBySession(sessionId);
    if (!token) throw new Error('Invalid session');
    return this.getUserOrgs(token);
  }

  async getUserReposBySession(sessionId: string) {
    const token = await this.sessionService.getTokenBySession(sessionId);
    if (!token) throw new Error('Invalid session');
    return this.getUserRepos(token);
  }

  async getOrgReposBySession(org: string, sessionId: string) {
    const token = await this.sessionService.getTokenBySession(sessionId);
    if (!token) throw new Error('Invalid session');
    return this.getOrgRepos(org, token);
  }

  async getCommitsBySession(owner: string, repo: string, sessionId: string) {
    const token = await this.sessionService.getTokenBySession(sessionId);
    if (!token) throw new Error('Invalid session');
    return this.getCommits(owner, repo, token);
  }

  async getCommitDetailsBySession(owner: string, repo: string, sha: string, sessionId: string) {
    const token = await this.sessionService.getTokenBySession(sessionId);
    if (!token) throw new Error('Invalid session');
    return this.getCommitDetails(owner, repo, sha, token);
  }
}
