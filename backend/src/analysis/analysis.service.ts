import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalysisResult } from '../database/entities/analysis-result.entity';
import { GithubService } from '../github/github.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class AnalysisService {
  constructor(
    @InjectRepository(AnalysisResult)
    private analysisRepository: Repository<AnalysisResult>,
    private githubService: GithubService,
    private aiService: AiService,
  ) {}

  //  Repo analizi
  async analyzeRepo(
    owner: string,
    repo: string,
    token: string,
    since?: string,
    until?: string,
    commitLimit: number = 50,
  ) {
    const cacheKey = this.getCacheKey(owner, repo, since, until);
    const cached = await this.getCachedResults(cacheKey, since, until);
    /*
    // Eğer önbellekten döndürmek istersen, bu bloğu açabilirsin
    if (cached && cached.users.length > 0) {
      return {
        owner,
        repo,
        analyzedCommits: cached.analyzedCommits,
        totalCommits: cached.totalCommits,
        fromCache: true,
        users: cached.users,
        isOrgWide: false,
      };
    }
    */

    const commits = await this.githubService.getCommits(owner, repo, token);
    const filtered = commits.filter((c: any) => {
      const date = new Date(c.commit.author.date);
      if (since && date < new Date(since)) return false;
      if (until && date > new Date(until)) return false;
      return true;
    });

    const userToScores: Record<string, { aiScoreSum: number; commitCount: number }> = {};
    const totalCommits = filtered.length;

    for (const commit of filtered.slice(0, commitLimit)) {
      const sha = commit.sha;
      const authorLogin = commit.author?.login || commit.commit?.author?.name || 'unknown';

      let detail: any;
      try {
        detail = await this.githubService.getCommitDetails(owner, repo, sha, token);
      } catch (err) {
        console.warn(` Commit detayı alınamadı: ${sha} (${(err as any).message})`);
        continue;
      }

      const fileCount = detail?.files?.length || 0;
      console.log(`Commit: ${sha}, Dosya sayısı: ${fileCount}`);

      const fileSummaries: string[] = [];

      // Dosyaları işleme
      if (detail?.files && detail.files.length > 0) {
        for (const f of detail.files) {
          const patch = f.patch || '';
          if (patch) {
            const truncated = patch.length > 4000 ? patch.slice(0, 4000) : patch;
            fileSummaries.push(`File: ${f.filename}\n${truncated}`);
          } else if (f.additions || f.deletions) {
            fileSummaries.push(`File: ${f.filename}\n+${f.additions ?? 0} lines, -${f.deletions ?? 0} lines`);
          }
        }
      } else {
        //  Eğer diff yoksa commit mesajını fallback olarak kullan
        const message = commit.commit?.message || '(No diff available)';
        fileSummaries.push(`Commit message: ${message}`);
      }

      const diffText = fileSummaries.join('\n\n');
      if (!diffText || diffText.trim().length === 0) {
        console.warn(` ${sha} boş diffText — analiz atlandı.`);
        continue;
      }

      let aiPercent = 0;
      try {
        aiPercent = await this.aiService.detectAI(diffText);
        await new Promise((res) => setTimeout(res, 500)); // Azure için küçük gecikme
      } catch (err) {
        console.warn(` detectAI hatası (${sha}):`, (err as any).message);
      }

      if (!userToScores[authorLogin]) {
        userToScores[authorLogin] = { aiScoreSum: 0, commitCount: 0 };
      }
      userToScores[authorLogin].aiScoreSum += aiPercent;
      userToScores[authorLogin].commitCount += 1;
    }

    // Sonuç hesaplama
    const results = Object.entries(userToScores).map(([user, v]) => {
      const avgAi = v.commitCount ? Math.round(v.aiScoreSum / v.commitCount) : 0;
      return {
        user,
        aiPercent: avgAi,
        humanPercent: 100 - avgAi,
        commitsAnalyzed: v.commitCount,
      };
    });

    //  Veritabanına kaydet
    await this.cacheResults(owner, repo, results, totalCommits, since, until, false);

    return {
      owner,
      repo,
      analyzedCommits: totalCommits,
      totalCommits,
      users: results,
      isOrgWide: false,
    };
  }

  //  Organizasyon analizi
  async analyzeOrganization(
    org: string,
    token: string,
    since?: string,
    until?: string,
    commitLimit: number = 50,
  ) {
    const repos = await this.githubService.getOrgRepos(org, token);
    const allResults: any[] = [];

    for (const repo of repos) {
      try {
        const result = await this.analyzeRepo(
          repo.owner.login,
          repo.name,
          token,
          since,
          until,
          commitLimit,
        );
        allResults.push(result);
      } catch (error) {
        console.error(`Error analyzing ${repo.full_name}:`, error);
      }
    }

    const userAggregates: Record<string, { aiSum: number; commitSum: number }> = {};
    for (const result of allResults) {
      for (const user of result.users) {
        if (!userAggregates[user.user]) {
          userAggregates[user.user] = { aiSum: 0, commitSum: 0 };
        }
        userAggregates[user.user].aiSum += user.aiPercent * user.commitsAnalyzed;
        userAggregates[user.user].commitSum += user.commitsAnalyzed;
      }
    }

    const aggregatedResults = Object.entries(userAggregates).map(([user, data]) => ({
      user,
      aiPercent: data.commitSum > 0 ? Math.round(data.aiSum / data.commitSum) : 0,
      humanPercent: data.commitSum > 0 ? 100 - Math.round(data.aiSum / data.commitSum) : 100,
      commitsAnalyzed: data.commitSum,
    }));

    const totalAggregatedCommits = aggregatedResults.reduce((s, r) => s + r.commitsAnalyzed, 0);
    await this.cacheResults(org, '', aggregatedResults, totalAggregatedCommits, since, until, true);

    return {
      organization: org,
      analyzedRepos: allResults.length,
      totalRepos: repos.length,
      users: aggregatedResults,
      isOrgWide: true,
    };
  }

  //  Cache işlemleri
  private getCacheKey(owner: string, repo: string, since?: string, until?: string): string {
    const repoPart = repo && repo !== 'all' ? repo : 'org';
    return `${owner}/${repoPart}_${since || 'all'}_${until || 'all'}`;
  }

  private async getCachedResults(cacheKey: string, since?: string, until?: string) {
    const parts = cacheKey.split('_');
    const repoAndOwner = parts[0];
    const isOrgWide = !repoAndOwner.includes('/');
    const owner = repoAndOwner.includes('/') ? repoAndOwner.split('/')[0] : repoAndOwner;
    const repo = repoAndOwner.includes('/') ? repoAndOwner.split('/')[1] : '';

    const results = await this.analysisRepository.find({
      where: {
        owner,
        repo: repo || '',
        sinceDate: since || null,
        untilDate: until || null,
        isOrgWide,
      } as any,
      order: { createdAt: 'DESC' },
    });

    if (results.length === 0) return { analyzedCommits: 0, totalCommits: 0, users: [] };

    const analyzedCommits = results[0].totalCommits || 0;
    const users = results.map((r) => ({
      user: r.user,
      aiPercent: r.aiPercent,
      humanPercent: r.humanPercent,
      commitsAnalyzed: r.commitsAnalyzed,
    }));

    return { analyzedCommits, totalCommits: analyzedCommits, users };
  }

  private async cacheResults(
    owner: string,
    repo: string,
    results: any[],
    totalCommits: number,
    since?: string,
    until?: string,
    isOrgWide: boolean = false,
  ): Promise<void> {
    for (const result of results) {
      const analysis = this.analysisRepository.create({
        owner,
        repo,
        user: result.user,
        aiPercent: result.aiPercent,
        humanPercent: result.humanPercent,
        commitsAnalyzed: result.commitsAnalyzed,
        totalCommits,
        sinceDate: since,
        untilDate: until,
        isOrgWide,
      });
      await this.analysisRepository.save(analysis);
    }
  }

  async getAnalysisHistory(owner?: string, repo?: string) {
    const where: any = {};
    if (owner) where.owner = owner;
    if (repo) where.repo = repo;

    return this.analysisRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }
}
