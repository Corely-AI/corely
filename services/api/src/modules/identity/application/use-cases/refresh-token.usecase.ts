import { IRefreshTokenRepository } from "../ports/refresh-token.repo.port";
import { ITokenService } from "../ports/token-service.port";
import { IUserRepository } from "../ports/user.repo.port";
import { IAuditPort } from "../ports/audit.port";
import { IClock } from "../ports/clock.port";
import { createHash, randomUUID } from "crypto";

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface RefreshTokenOutput {
  accessToken: string;
  refreshToken: string;
}

/**
 * Refresh Token Use Case
 * Rotates the refresh token for security
 */
export class RefreshTokenUseCase {
  constructor(
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly tokenService: ITokenService,
    private readonly userRepo: IUserRepository,
    private readonly audit: IAuditPort,
    private readonly clock: IClock
  ) {}

  async execute(input: RefreshTokenInput): Promise<RefreshTokenOutput> {
    // 1. Hash the provided refresh token
    const tokenHash = await this.hashRefreshToken(input.refreshToken);

    // 2. Find and validate refresh token
    const storedToken = await this.refreshTokenRepo.findValidByHash(tokenHash);

    if (!storedToken || storedToken.revokedAt) {
      throw new Error("Invalid or revoked refresh token");
    }

    // 3. Check expiration
    if (storedToken.expiresAt < this.clock.now()) {
      throw new Error("Refresh token has expired");
    }

    // 4. Get user info
    const user = await this.userRepo.findById(storedToken.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // 5. Generate new tokens
    const accessToken = this.tokenService.generateAccessToken({
      userId: storedToken.userId,
      email: user.getEmail().getValue(),
      tenantId: storedToken.tenantId,
    });

    const newRefreshToken = this.tokenService.generateRefreshToken();
    const { refreshTokenExpiresInMs } = this.tokenService.getExpirationTimes();

    // 6. Revoke old token and create new one
    await this.refreshTokenRepo.revoke(storedToken.id);

    const newTokenId = randomUUID();
    const newTokenHash = await this.hashRefreshToken(newRefreshToken);

    await this.refreshTokenRepo.create({
      id: newTokenId,
      userId: storedToken.userId,
      tenantId: storedToken.tenantId,
      tokenHash: newTokenHash,
      expiresAt: new Date(this.clock.nowMs() + refreshTokenExpiresInMs),
    });

    // 7. Audit log
    await this.audit.write({
      tenantId: storedToken.tenantId,
      actorUserId: storedToken.userId,
      action: "user.token_refreshed",
      targetType: "RefreshToken",
      targetId: newTokenId,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  private async hashRefreshToken(token: string): Promise<string> {
    return createHash("sha256").update(token).digest("hex");
  }
}
