import { Controller, Get, Headers, Param, Query } from '@nestjs/common';
import { GithubService } from './github.service';

@Controller('github')
export class GithubController {
    constructor(private readonly githubService: GithubService) { }

    @Get('me')
    me(@Headers('x-session-id') sessionId: string) {
        return this.githubService.getUserBySession(sessionId);
    }

    @Get('orgs')
    orgs(@Headers('x-session-id') sessionId: string) {
        return this.githubService.getUserOrgsBySession(sessionId);
    }

    @Get('repos')
    repos(
        @Headers('x-session-id') sessionId: string,
        @Query('org') org?: string,
    ) {
        if (org) {
            return this.githubService.getOrgReposBySession(org, sessionId);
        }
        return this.githubService.getUserReposBySession(sessionId);
    }

    @Get('commits/:owner/:repo')
    commits(
        @Headers('x-session-id') sessionId: string,
        @Param('owner') owner: string,
        @Param('repo') repo: string,
    ) {
        return this.githubService.getCommitsBySession(owner, repo, sessionId);
    }

    @Get('commit/:owner/:repo/:sha')
    commit(
        @Headers('x-session-id') sessionId: string,
        @Param('owner') owner: string,
        @Param('repo') repo: string,
        @Param('sha') sha: string,
    ) {
        return this.githubService.getCommitDetailsBySession(owner, repo, sha, sessionId);
    }
}


