import { Injectable, Logger } from "@nestjs/common";
import { createHash, randomUUID } from "crypto";
import type { PortalOtpRepositoryPort } from "../ports/portal-otp.port";
import type { PortalSessionRepositoryPort } from "../ports/portal-session.port";
import type { TokenServicePort } from "../../../identity/application/ports/token-service.port";
import type { AuditPort } from "../../../identity/application/ports/audit.port";
import { PrismaService } from "@corely/data";
import { normalizeEmail, verifyOtpCode, PORTAL_REFRESH_TTL_DAYS } from "../portal-otp.utils";

export interface PortalVerifyCodeInput {
  email: string;
  code: string;
  tenantId: string;
  workspaceId: string;
  userAgent?: string;
  ip?: string;
}

export interface PortalVerifyCodeOutput {
  accessToken: string;
  refreshToken: string;
  user: {
    userId: string;
    email: string;
    displayName: string;
    role: "GUARDIAN" | "STUDENT";
  };
}

@Injectable()
export class PortalVerifyCodeUseCase {
  private readonly logger = new Logger(PortalVerifyCodeUseCase.name);

  constructor(
    private readonly otpRepo: PortalOtpRepositoryPort,
    private readonly sessionRepo: PortalSessionRepositoryPort,
    private readonly tokenService: TokenServicePort,
    private readonly audit: AuditPort,
    private readonly prisma: PrismaService,
    private readonly idGenerator: { newId: () => string }
  ) {}

  async execute(input: PortalVerifyCodeInput): Promise<PortalVerifyCodeOutput> {
    const { tenantId, workspaceId } = input;
    const emailNormalized = normalizeEmail(input.email);
    const now = new Date();

    // 1. Load latest active OTP
    const otp = await this.otpRepo.findLatestActive(tenantId, workspaceId, emailNormalized, now);

    if (!otp) {
      throw new InvalidCodeError();
    }

    // 2. Check if locked (max attempts)
    if (otp.attemptCount >= otp.maxAttempts) {
      throw new InvalidCodeError();
    }

    // 3. Verify code using constant-time comparison
    const isValid = verifyOtpCode(tenantId, workspaceId, emailNormalized, input.code, otp.codeHash);

    if (!isValid) {
      // Increment attempt count
      await this.otpRepo.incrementAttempts(otp.id);
      throw new InvalidCodeError();
    }

    // 4. Consume OTP
    await this.otpRepo.consume(otp.id);

    // 5. Resolve portal identity using shared email rule:
    //    GUARDIAN preferred over STUDENT
    const portalIdentity = await this.resolvePortalIdentity(tenantId, workspaceId, emailNormalized);

    if (!portalIdentity) {
      // Should not happen if request-code verified, but guard anyway
      throw new InvalidCodeError();
    }

    // 6. Create session + tokens
    const membership = await this.prisma.membership.findFirst({
      where: { tenantId, userId: portalIdentity.userId },
    });

    const accessToken = this.tokenService.generateAccessToken({
      userId: portalIdentity.userId,
      email: emailNormalized,
      tenantId,
      roleIds: membership ? [membership.roleId] : [],
    });

    const refreshToken = randomUUID();
    const refreshTokenHash = createHash("sha256").update(refreshToken).digest("hex");
    const sessionId = this.idGenerator.newId();
    const expiresAt = new Date(now.getTime() + PORTAL_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

    await this.sessionRepo.create({
      id: sessionId,
      tenantId,
      workspaceId,
      userId: portalIdentity.userId,
      refreshTokenHash,
      expiresAt,
      userAgent: input.userAgent,
      ip: input.ip,
    });

    // 7. Audit
    await this.audit.write({
      tenantId,
      actorUserId: portalIdentity.userId,
      action: "portal.login_succeeded",
      targetType: "PortalSession",
      targetId: sessionId,
      metadataJson: JSON.stringify({
        workspaceId,
        role: portalIdentity.role,
      }),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        userId: portalIdentity.userId,
        email: emailNormalized,
        displayName: portalIdentity.displayName,
        role: portalIdentity.role,
      },
    };
  }

  /**
   * Shared email rule:
   * 1) If GUARDIAN portal user exists -> prefer GUARDIAN
   * 2) Else if STUDENT portal user exists -> use STUDENT
   * 3) Else -> null
   */
  private async resolvePortalIdentity(
    tenantId: string,
    _workspaceId: string,
    emailNormalized: string
  ): Promise<{
    userId: string;
    partyId: string;
    displayName: string;
    role: "GUARDIAN" | "STUDENT";
  } | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        email: emailNormalized,
        partyId: { not: null },
        memberships: { some: { tenantId } },
      },
    });

    if (!user || !user.partyId) {
      return null;
    }

    const party = await this.prisma.party.findFirst({
      where: { id: user.partyId, tenantId },
    });

    if (!party) {
      return null;
    }

    const partyRoles = await this.prisma.partyRole.findMany({
      where: {
        tenantId,
        partyId: user.partyId,
        role: { in: ["GUARDIAN", "STUDENT"] },
      },
    });

    const roleNames = partyRoles.map((r) => r.role);

    // Prefer GUARDIAN
    if (roleNames.includes("GUARDIAN")) {
      return {
        userId: user.id,
        partyId: user.partyId,
        displayName: party.displayName,
        role: "GUARDIAN",
      };
    }

    if (roleNames.includes("STUDENT")) {
      return {
        userId: user.id,
        partyId: user.partyId,
        displayName: party.displayName,
        role: "STUDENT",
      };
    }

    return null;
  }
}

class InvalidCodeError extends Error {
  public readonly statusCode = 400;
  public readonly code = "INVALID_CODE";

  constructor() {
    super("Invalid or expired code");
    this.name = "InvalidCodeError";
  }
}
