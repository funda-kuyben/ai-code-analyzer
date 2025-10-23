import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { GithubService } from '../github/github.service';

type AnalyzeRequest = {
    owner: string;
    repo: string;
    token: string; // GitHub token
    since?: string; 
    until?: string; 
};

@Controller('ai')
export class AiController {
    constructor(
        private readonly aiService: AiService, //kod farklarını analiz
        private readonly githubService: GithubService, //GitHub’dan commitleri çekme ve detaylarına ulaşma
    ) { }

    @Post('analyze-repo')
    async analyzeRepo(@Body() body: AnalyzeRequest) {
        const { owner, repo, token, since, until } = body;
        const commits = await this.githubService.getCommits(owner, repo, token);

        const filtered = commits.filter((c: any) => { //Eğer kullanıcı “şu tarihler arasını analiz et” dediyse
            const date = new Date(c.commit.author.date);
            if (since && date < new Date(since)) return false; //aralık dışındaki commitler çıkarılır.
            if (until && date > new Date(until)) return false;
            return true;
        });

        const userToScores: Record<string, { aiScoreSum: number; commitCount: number }> = {}; //Her kullanıcının toplam AI skorunu ve commit sayısını tutmak için

        for (const commit of filtered.slice(0, 50)) { 
            const sha = commit.sha; //commit kimliği
            const authorLogin = commit.author?.login || commit.commit?.author?.name || 'unknown';
            const detail = await this.githubService.getCommitDetails(owner, repo, sha, token); //commit’in dosya farklarını (diff) alır

            const fileSummaries: string[] = []; //Diff oluşturma (AI’ye gönderilecek veri)
            for (const f of detail.files || []) {
                //Patch = hangi satırlar eklendi, hangileri silindi (+ ve - ile).
                const patch = f.patch || '';
                if (!patch) continue;
                const truncated = patch.length > 4000 ? patch.slice(0, 4000) : patch;
                fileSummaries.push(`File: ${f.filename}\n${truncated}`);
            }

            const diffText = fileSummaries.join('\n\n');
            if (!diffText) continue;

            const aiPercent = await this.aiService.detectAI(diffText);

            if (!userToScores[authorLogin]) {
                userToScores[authorLogin] = { aiScoreSum: 0, commitCount: 0 };
            }
            userToScores[authorLogin].aiScoreSum += aiPercent;
            userToScores[authorLogin].commitCount += 1;
        }

        const result = Object.entries(userToScores).map(([user, v]) => {
            const avgAi = v.commitCount ? Math.round(v.aiScoreSum / v.commitCount) : 0;
            return {
                user,
                aiPercent: avgAi,
                humanPercent: 100 - avgAi,
                commitsAnalyzed: v.commitCount,
            };
        });

        return { owner, repo, analyzedCommits: filtered.length, users: result };
    }
}



