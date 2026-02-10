import { Injectable, Logger } from "@nestjs/common";
import { createHash, randomUUID } from "crypto";
import type { PortalSessionRepositoryPort } from "../ports/portal-session.port";
import type { TokenServicePort } from "../../../identity/application/ports/token-service.port";
import type { AuditPort } from "../../../identity/application/ports/audit.port";
import { PrismaService } from "@corely/data";
import { PORTAL_REFRESH_TTL_DAYS } from "../portal-otp.utils";

export interface PortalRefreshInput {
  refreshToken: string;
}

export interface PortalRefreshOutput {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class PortalRefreshUseCase {
  private readonly logger = new Logger(PortalRefreshUseCase.name);

  constructor(
    private readonly sessionRepo: PortalSessionRepositoryPort,
    private readonly tokenService: TokenServicePort,
    private readonly audit: AuditPort,
    private readonly prisma: PrismaService,
    private readonly idGenerator: { newId: () => string }
  ) {}

  async execute(input: PortalRefreshInput): Promise<PortalRefreshOutput> {
    const tokenHash = createHash("sha256").update(input.refreshToken).digest("hex");
    const now = new Date();

    // 1. Find valid session
    const session = await this.sessionRepo.findValidByHash(tokenHash);
    if (!session) {
      throw new UnauthorizedPortalError("Invalid or expired session");
    }

    // 2. Get user info for new access token
    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      throw new UnauthorizedPortalError("User not found");
    }

    const membership = await this.prisma.membership.findFirst({
      where: { tenantId: session.tenantId, userId: session.userId },
    });

    // 3. Revoke old session
    await this.sessionRepo.revoke(session.id);

    // 4. Generate new tokens
    const accessToken = this.tokenService.generateAccessToken({
      userId: session.userId,
      email: user.email,
      tenantId: session.tenantId,
      roleIds: membership ? [membership.roleId] : [],
    });

    const newRefreshToken = randomUUID();
    const newRefreshTokenHash = createHash("sha256").update(newRefreshToken).digest("hex");
    const newSessionId = this.idGenerator.newId();
    const expiresAt = new Date(now.getTime() + PORTAL_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

    await this.sessionRepo.create({
      id: newSessionId,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      userId: session.userId,
      refreshTokenHash: newRefreshTokenHash,
      expiresAt,
      userAgent: session.userAgent ?? undefined,
      ip: session.ip ?? undefined,
    });

    // 5. Audit
    await this.audit.write({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      action: "portal.token_refreshed",
      targetType: "PortalSession",
      targetId: newSessionId,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }
}

class UnauthorizedPortalError extends Error {
  public readonly statusCode = 401;
  public readonly code = "UNAUTHORIZED";

  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedPortalError";
  }
}
