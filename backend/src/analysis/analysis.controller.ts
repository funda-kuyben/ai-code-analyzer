import { Controller, Post, Body, Get, Query, Headers } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { SessionService } from '../session/session.service';

@Controller('analysis')
export class AnalysisController {
    constructor(
        private readonly analysisService: AnalysisService,
        private readonly sessionService: SessionService,
    ) { }

    @Post('repo')
    async analyzeRepo(
        @Body() body: {
            owner: string;
            repo: string;
            sessionId: string;
            since?: string;
            until?: string;
            commitLimit?: number;
        },
    ) {
        const token = await this.sessionService.getTokenBySession(body.sessionId);
        if (!token) {
            throw new Error('Geçersiz oturum');
        }

        return await this.analysisService.analyzeRepo(
            body.owner,
            body.repo,
            token,
            body.since,
            body.until,
            body.commitLimit || 50,
        );
    }

    @Post('organization')
    async analyzeOrganization(
        @Body() body: {
            org: string;
            sessionId: string;
            since?: string;
            until?: string;
            commitLimit?: number;
        },
    ) {
        const token = await this.sessionService.getTokenBySession(body.sessionId);
        if (!token) {
            throw new Error('Geçersiz oturum');
        }

        return await this.analysisService.analyzeOrganization(
            body.org,
            token,
            body.since,
            body.until,
            body.commitLimit || 50,
        );
    }

    @Get('history')
    async getHistory(
        @Query('owner') owner?: string,
        @Query('repo') repo?: string,
    ) {
        return await this.analysisService.getAnalysisHistory(owner, repo);
    }
}



