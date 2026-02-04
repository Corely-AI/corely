import { type PasswordResetTokenRepositoryPort } from "../../application/ports/password-reset-token-repository.port";

export class FakePasswordResetTokenRepository implements PasswordResetTokenRepositoryPort {
  tokens: Array<{
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    usedAt: Date | null;
    createdAt: Date;
  }> = [];

  async create(data: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    createdAt?: Date;
  }): Promise<void> {
    this.tokens.push({
      id: data.id,
      userId: data.userId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      usedAt: null,
      createdAt: data.createdAt ?? new Date(),
    });
  }

  async findByHash(tokenHash: string): Promise<{
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    usedAt: Date | null;
    createdAt: Date;
  } | null> {
    return this.tokens.find((t) => t.tokenHash === tokenHash) ?? null;
  }

  async markUsed(id: string, usedAt: Date): Promise<void> {
    this.tokens = this.tokens.map((t) => (t.id === id ? { ...t, usedAt } : t));
  }

  async markAllUsedForUser(userId: string, usedAt: Date): Promise<void> {
    this.tokens = this.tokens.map((t) => (t.userId === userId && !t.usedAt ? { ...t, usedAt } : t));
  }
}
