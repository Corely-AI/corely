import { Injectable, Inject } from "@nestjs/common";
import { createHash } from "crypto";
import { type UnitOfWorkPort, UNIT_OF_WORK, ValidationError } from "@corely/kernel";
import {
  type PasswordResetTokenRepositoryPort,
  PASSWORD_RESET_TOKEN_REPOSITORY_TOKEN,
} from "../ports/password-reset-token-repository.port";
import { type UserRepositoryPort, USER_REPOSITORY_TOKEN } from "../ports/user-repository.port";
import { type PasswordHasherPort, PASSWORD_HASHER_TOKEN } from "../ports/password-hasher.port";
import { User } from "../../domain/entities/user.entity";
import { type ClockPort, CLOCK_PORT_TOKEN } from "../../../../shared/ports/clock.port";
import { type RequestContext } from "../../../../shared/context/request-context";

export interface ConfirmPasswordResetInput {
  token: string;
  newPassword: string;
  context: RequestContext;
}

export interface ConfirmPasswordResetOutput {
  ok: true;
}

@Injectable()
export class ConfirmPasswordResetUseCase {
  constructor(
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY_TOKEN)
    private readonly resetTokenRepo: PasswordResetTokenRepositoryPort,
    @Inject(USER_REPOSITORY_TOKEN) private readonly userRepo: UserRepositoryPort,
    @Inject(PASSWORD_HASHER_TOKEN) private readonly passwordHasher: PasswordHasherPort,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort
  ) {}

  async execute(input: ConfirmPasswordResetInput): Promise<ConfirmPasswordResetOutput> {
    this.validate(input);

    const tokenHash = this.hashToken(input.token.trim());
    const now = this.clock.now();

    await this.uow.withinTransaction(async (tx) => {
      const token = await this.resetTokenRepo.findByHash(tokenHash, tx);
      if (!token || token.usedAt || token.expiresAt <= now) {
        throw new ValidationError("Invalid or expired reset token");
      }

      const user = await this.userRepo.findById(token.userId, tx);
      if (!user) {
        throw new ValidationError("Invalid or expired reset token");
      }

      const passwordHash = await this.passwordHasher.hash(input.newPassword);
      const updatedUser = User.restore({
        id: user.getId(),
        email: user.getEmail().getValue(),
        passwordHash,
        name: user.getName(),
        status: user.getStatus(),
        createdAt: user.getCreatedAt(),
      });

      await this.userRepo.update(updatedUser, tx);
      await this.resetTokenRepo.markUsed(token.id, now, tx);
    });

    return { ok: true };
  }

  private validate(input: ConfirmPasswordResetInput) {
    if (!input.token) {
      throw new ValidationError("Reset token is required");
    }
    if (!input.newPassword || input.newPassword.length < 6) {
      throw new ValidationError("Password must be at least 6 characters long");
    }
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
