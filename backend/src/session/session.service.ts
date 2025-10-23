import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSession } from '../database/entities/user-session.entity';
import * as crypto from 'crypto';

@Injectable()
export class SessionService {
    constructor(
        @InjectRepository(UserSession)
        private userSessionRepository: Repository<UserSession>,
    ) { }

    // In-memory fallback storage to keep the app functional when DB is unavailable
    private inMemorySessions = new Map<string, { githubToken: string; githubUser: string; sessionId: string }>();

    async createSession(githubToken: string, githubUser: string): Promise<string> {
        const sessionId = crypto.randomBytes(32).toString('hex');
        try {
            const session = this.userSessionRepository.create({
                githubToken,
                githubUser,
                sessionId,
            });
            await this.userSessionRepository.save(session);
            return sessionId;
        } catch {
            // Fallback to memory if DB write fails
            this.inMemorySessions.set(sessionId, { githubToken, githubUser, sessionId });
            return sessionId;
        }
    }

    async getSession(sessionId: string): Promise<UserSession | null> {
        try {
            return await this.userSessionRepository.findOne({
                where: { sessionId },
            });
        } catch {
            const mem = this.inMemorySessions.get(sessionId);
            return mem
                ? ({
                    id: 0,
                    githubToken: mem.githubToken,
                    githubUser: mem.githubUser,
                    sessionId: mem.sessionId,
                } as unknown as UserSession)
                : null;
        }
    }

    async deleteSession(sessionId: string): Promise<void> {
        try {
            await this.userSessionRepository.delete({ sessionId });
        } catch {
            this.inMemorySessions.delete(sessionId);
        }
    }

    async getUserBySession(sessionId: string): Promise<string | null> {
        const session = await this.getSession(sessionId);
        return session ? session.githubUser : null;
    }

    async getTokenBySession(sessionId: string): Promise<string | null> {
        const session = await this.getSession(sessionId);
        return session ? session.githubToken : null;
    }
}

