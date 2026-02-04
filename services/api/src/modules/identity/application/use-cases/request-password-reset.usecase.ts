import { Injectable, Inject, Logger } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import { EnvService } from "@corely/config";
import { type UnitOfWorkPort, UNIT_OF_WORK, ValidationError } from "@corely/kernel";
import { Email } from "../../domain/value-objects/email.vo";
import { type UserRepositoryPort, USER_REPOSITORY_TOKEN } from "../ports/user-repository.port";
import {
  type PasswordResetTokenRepositoryPort,
  PASSWORD_RESET_TOKEN_REPOSITORY_TOKEN,
} from "../ports/password-reset-token-repository.port";
import {
  type PasswordResetEmailPort,
  PASSWORD_RESET_EMAIL_PORT,
} from "../ports/password-reset-email.port";
import { type ClockPort, CLOCK_PORT_TOKEN } from "../../../../shared/ports/clock.port";
import {
  type IdGeneratorPort,
  ID_GENERATOR_TOKEN,
} from "../../../../shared/ports/id-generator.port";
import { type RequestContext } from "../../../../shared/context/request-context";

export interface RequestPasswordResetInput {
  email: string;
  context: RequestContext;
}

export interface RequestPasswordResetOutput {
  ok: true;
}

@Injectable()
export class RequestPasswordResetUseCase {
  private readonly logger = new Logger(RequestPasswordResetUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY_TOKEN) private readonly userRepo: UserRepositoryPort,
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY_TOKEN)
    private readonly resetTokenRepo: PasswordResetTokenRepositoryPort,
    @Inject(PASSWORD_RESET_EMAIL_PORT) private readonly emailSender: PasswordResetEmailPort,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort,
    @Inject(ID_GENERATOR_TOKEN) private readonly idGenerator: IdGeneratorPort,
    private readonly env: EnvService
  ) {}

  async execute(input: RequestPasswordResetInput): Promise<RequestPasswordResetOutput> {
    const email = this.normalizeEmail(input.email);
    const user = await this.userRepo.findByEmail(email);

    if (!user) {
      return { ok: true };
    }

    const now = this.clock.now();
    const ttlMinutes = this.env.PASSWORD_RESET_TOKEN_TTL_MINUTES;
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);
    const rawToken = this.generateToken();
    const tokenHash = this.hashToken(rawToken);
    const tokenId = this.idGenerator.newId();
    const resetUrl = this.buildResetUrl(rawToken);
    const tenantId = input.context.tenantId ?? "host";

    await this.uow.withinTransaction(async (tx) => {
      await this.resetTokenRepo.markAllUsedForUser(user.getId(), now, tx);
      await this.resetTokenRepo.create(
        {
          id: tokenId,
          userId: user.getId(),
          tokenHash,
          expiresAt,
          createdAt: now,
        },
        tx
      );
    });

    try {
      await this.emailSender.send({
        tenantId,
        to: user.getEmail().getValue(),
        resetUrl,
        idempotencyKey: tokenId,
        correlationId: input.context.requestId,
      });
    } catch (error) {
      const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
      this.logger.error("Failed to send password reset email", detail);
    }

    return { ok: true };
  }

  private normalizeEmail(email: string): string {
    try {
      return Email.create(email).getValue();
    } catch {
      throw new ValidationError("Invalid email");
    }
  }

  private generateToken(): string {
    return randomBytes(32).toString("hex");
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private buildResetUrl(token: string): string {
    const baseUrl = this.env.WEB_BASE_URL ?? `http://localhost:${this.env.WEB_PORT}`;
    const url = new URL("/auth/reset-password", baseUrl);
    url.searchParams.set("token", token);
    return url.toString();
  }
}
