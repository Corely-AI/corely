import { Injectable } from '@nestjs/common';
import { prisma } from '@kerniflow/data';
import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { IUserRepository } from '../../application/ports/user.repo.port';

/**
 * Prisma User Repository Implementation
 * Data layer - talks to Prisma
 */
@Injectable()
export class PrismaUserRepository implements IUserRepository {
  async create(user: User): Promise<User> {
    const data = await prisma.user.create({
      data: {
        id: user.getId(),
        email: user.getEmail().getValue(),
        name: user.getName(),
        passwordHash: user.getPasswordHash(),
        status: user.getStatus(),
        createdAt: user.getCreatedAt()
      }
    });

    return User.restore(data);
  }

  async findById(id: string): Promise<User | null> {
    const data = await prisma.user.findUnique({
      where: { id }
    });

    if (!data) return null;
    return User.restore(data);
  }

  async findByEmail(email: string): Promise<User | null> {
    const data = await prisma.user.findUnique({
      where: { email }
    });

    if (!data) return null;
    return User.restore(data);
  }

  async emailExists(email: string): Promise<boolean> {
    const count = await prisma.user.count({
      where: { email }
    });

    return count > 0;
  }

  async update(user: User): Promise<User> {
    const data = await prisma.user.update({
      where: { id: user.getId() },
      data: {
        email: user.getEmail().getValue(),
        name: user.getName(),
        passwordHash: user.getPasswordHash(),
        status: user.getStatus(),
        updatedAt: new Date()
      }
    });

    return User.restore(data);
  }
}
