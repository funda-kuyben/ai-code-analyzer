import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { AnalysisResult } from '../database/entities/analysis-result.entity';
import { GithubModule } from '../github/github.module';
import { AiModule } from '../ai/ai.module';
import { SessionModule } from '../session/session.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([AnalysisResult]),
        GithubModule,
        AiModule,
        SessionModule,
    ],
    controllers: [AnalysisController],
    providers: [AnalysisService],
    exports: [AnalysisService],
})
export class AnalysisModule { }



