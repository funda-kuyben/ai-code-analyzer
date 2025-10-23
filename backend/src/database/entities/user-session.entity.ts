import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
//Bu tablo, kullanıcının GitHub oturum bilgilerini saklar.
@Entity('user_sessions')
export class UserSession {
    @PrimaryGeneratedColumn()
    id: number; 

    @Column()
    githubToken: string; 

    @Column()
    githubUser: string; 

    @Column()
    sessionId: string; 

    @CreateDateColumn()
    createdAt: Date; 
}
