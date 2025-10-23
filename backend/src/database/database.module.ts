//veritabanı bağlantısı
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalysisResult } from './entities/analysis-result.entity';
import { UserSession } from './entities/user-session.entity';
import * as dotenv from 'dotenv';
dotenv.config();

@Module({
    imports: [
        TypeOrmModule.forRoot({
            type: 'postgres',
            host: process.env.PG_HOST || 'localhost',
            port: process.env.PG_PORT ? parseInt(process.env.PG_PORT, 10) : 5432,
            username: process.env.PG_USER || 'postgres',
            password: process.env.PG_PASSWORD || 'postgres',
            database: process.env.PG_DB || 'code_analyzer',
            ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
            entities: [AnalysisResult, UserSession],
            synchronize: true, 
            logging: false, 
        }),
        TypeOrmModule.forFeature([AnalysisResult, UserSession]),
    ],
    exports: [TypeOrmModule],
})
export class DatabaseModule {}
