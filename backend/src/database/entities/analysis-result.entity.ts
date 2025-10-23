//her analiz sonucunu vt nda tutmak için
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('analysis_results')  // tablo adı
export class AnalysisResult {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    owner: string; 

    @Column()
    repo: string; 

    @Column()
    user: string; 

    @Column('int')
    aiPercent: number; 

    @Column('int')
    humanPercent: number; 

    @Column('int')
    commitsAnalyzed: number; 

    @Column('int')
    totalCommits: number; 

    @Column({ nullable: true })
    sinceDate: string; 

    @Column({ nullable: true })
    untilDate: string; 

    @Column({ default: false })
    isOrgWide: boolean; // analiz organizasyon geneli mi? (mesela tüm şirket repoları mı?)

    @CreateDateColumn()
    createdAt: Date;


    @UpdateDateColumn()
    updatedAt: Date;
}
