import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { GithubModule } from './github/github.module';
import { AiModule } from './ai/ai.module';
import { DatabaseModule } from './database/database.module';
import { AnalysisModule } from './analysis/analysis.module';
import * as dotenv from 'dotenv';
dotenv.config();


@Module({
  imports: [DatabaseModule, AuthModule, GithubModule, AiModule, AnalysisModule],
})
export class AppModule { }
