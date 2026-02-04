import { type TransactionContext } from "@corely/kernel";

export interface PasswordResetTokenRepositoryPort {
  create(
    data: {
      id: string;
      userId: string;
      tokenHash: string;
      expiresAt: Date;
      createdAt?: Date;
    },
    tx?: TransactionContext
  ): Promise<void>;

  findByHash(
    tokenHash: string,
    tx?: TransactionContext
  ): Promise<{
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    usedAt: Date | null;
    createdAt: Date;
  } | null>;

  markUsed(id: string, usedAt: Date, tx?: TransactionContext): Promise<void>;

  markAllUsedForUser(userId: string, usedAt: Date, tx?: TransactionContext): Promise<void>;
}

export const PASSWORD_RESET_TOKEN_REPOSITORY_TOKEN = "identity/password-reset-token-repository";
