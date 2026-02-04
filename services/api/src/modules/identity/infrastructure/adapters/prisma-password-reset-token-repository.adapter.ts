import { Inject, Injectable } from "@nestjs/common";
import { PrismaService, getPrismaClient } from "@corely/data";
import { type TransactionContext } from "@corely/kernel";
import { type PasswordResetTokenRepositoryPort } from "../../application/ports/password-reset-token-repository.port";

@Injectable()
export class PrismaPasswordResetTokenRepository implements PasswordResetTokenRepositoryPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(
    data: {
      id: string;
      userId: string;
      tokenHash: string;
      expiresAt: Date;
      createdAt?: Date;
    },
    tx?: TransactionContext
  ): Promise<void> {
    const client = getPrismaClient(this.prisma, tx as any);
    await client.passwordResetToken.create({
      data: {
        id: data.id,
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        createdAt: data.createdAt ?? new Date(),
      },
    });
  }

  async findByHash(
    tokenHash: string,
    tx?: TransactionContext
  ): Promise<{
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    usedAt: Date | null;
    createdAt: Date;
  } | null> {
    const client = getPrismaClient(this.prisma, tx as any);
    const token = await client.passwordResetToken.findFirst({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        tokenHash: true,
        expiresAt: true,
        usedAt: true,
        createdAt: true,
      },
    });
    if (!token) {
      return null;
    }
    return token;
  }

  async markUsed(id: string, usedAt: Date, tx?: TransactionContext): Promise<void> {
    const client = getPrismaClient(this.prisma, tx as any);
    await client.passwordResetToken.update({
      where: { id },
      data: { usedAt },
    });
  }

  async markAllUsedForUser(userId: string, usedAt: Date, tx?: TransactionContext): Promise<void> {
    const client = getPrismaClient(this.prisma, tx as any);
    await client.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt },
    });
  }
}
