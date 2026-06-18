import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from './entities/session.entity';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionsRepository: Repository<Session>,
  ) {}

  async createSession(data: Partial<Session>): Promise<Session> {
    const entity = this.sessionsRepository.create(data);
    return this.sessionsRepository.save(entity);
  }

  async findByToken(refreshToken: string): Promise<Session | null> {
    return this.sessionsRepository.findOne({ where: { refreshToken } });
  }

  async findByUser(userId: string): Promise<Session[]> {
    return this.sessionsRepository.find({ where: { userId } });
  }

  async deleteById(id: string): Promise<void> {
    await this.sessionsRepository.delete(id);
  }

  async deleteByToken(refreshToken: string): Promise<void> {
    await this.sessionsRepository.delete({ refreshToken });
  }

  async deleteOtherSessions(userId: string, excludeId?: string): Promise<void> {
    const qb = this.sessionsRepository
      .createQueryBuilder()
      .delete()
      .where('userId = :userId', { userId });
    if (excludeId) qb.andWhere('id != :excludeId', { excludeId });
    await qb.execute();
  }
}
