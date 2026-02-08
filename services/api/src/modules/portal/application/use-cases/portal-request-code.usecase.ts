import { Injectable, Logger } from "@nestjs/common";
import type { PortalOtpRepositoryPort } from "../ports/portal-otp.port";
import type { PortalEmailPort } from "../ports/portal-email.port";
import type { AuditPort } from "../../../identity/application/ports/audit.port";
import { PrismaService } from "@corely/data";
import {
  generateOtpCode,
  normalizeEmail,
  hashOtpCode,
  PORTAL_OTP_TTL_MINUTES,
  PORTAL_OTP_MAX_ATTEMPTS,
  PORTAL_OTP_RESEND_COOLDOWN_SECONDS,
} from "../portal-otp.utils";

export interface PortalRequestCodeInput {
  email: string;
  tenantId: string;
  workspaceId: string;
}

@Injectable()
export class PortalRequestCodeUseCase {
  private readonly logger = new Logger(PortalRequestCodeUseCase.name);

  constructor(
    private readonly otpRepo: PortalOtpRepositoryPort,
    private readonly emailSender: PortalEmailPort,
    private readonly audit: AuditPort,
    private readonly prisma: PrismaService,
    private readonly idGenerator: { newId: () => string }
  ) {}

  async execute(input: PortalRequestCodeInput): Promise<{ message: string }> {
    const { tenantId, workspaceId } = input;
    const emailNormalized = normalizeEmail(input.email);
    const now = new Date();

    // Always return generic message - never reveal if email exists
    const genericResponse = {
      message: "If this email is registered, a login code has been sent.",
    };

    try {
      // 1. Check if portal user exists for this email in this workspace
      const portalUser = await this.findPortalUserByEmail(tenantId, workspaceId, emailNormalized);
      if (!portalUser) {
        this.logger.debug(`No portal user found for email in workspace, silent 200`);
        return genericResponse;
      }

      // 2. Enforce resend cooldown
      const latestOtp = await this.otpRepo.findLatestActive(
        tenantId,
        workspaceId,
        emailNormalized,
        now
      );

      if (latestOtp) {
        const cooldownExpires = new Date(
          latestOtp.lastSentAt.getTime() + PORTAL_OTP_RESEND_COOLDOWN_SECONDS * 1000
        );
        if (now < cooldownExpires) {
          this.logger.debug(`Resend cooldown active for ${emailNormalized}`);
          return genericResponse;
        }
      }

      // 3. Invalidate old active codes
      await this.otpRepo.invalidateAllForEmail(tenantId, workspaceId, emailNormalized);

      // 4. Generate new OTP
      const code = generateOtpCode();
      const codeHash = hashOtpCode(tenantId, workspaceId, emailNormalized, code);
      const otpId = this.idGenerator.newId();
      const expiresAt = new Date(now.getTime() + PORTAL_OTP_TTL_MINUTES * 60 * 1000);

      await this.otpRepo.create({
        id: otpId,
        tenantId,
        workspaceId,
        emailNormalized,
        codeHash,
        expiresAt,
        maxAttempts: PORTAL_OTP_MAX_ATTEMPTS,
        lastSentAt: now,
      });

      // 5. Send email with idempotency
      const idempotencyKey = `portal:otp:${tenantId}:${workspaceId}:${emailNormalized}:${otpId}`;
      await this.emailSender.sendOtpCode({
        to: emailNormalized,
        code,
        expiryMinutes: PORTAL_OTP_TTL_MINUTES,
        idempotencyKey,
      });

      // 6. Audit (no code in logs)
      await this.audit.write({
        tenantId,
        actorUserId: null,
        action: "portal.otp_requested",
        targetType: "PortalOtpCode",
        targetId: otpId,
        metadataJson: JSON.stringify({
          workspaceId,
          emailHash: emailNormalized.substring(0, 3) + "***",
        }),
      });
    } catch (error) {
      // Swallow errors to prevent timing-based enumeration
      this.logger.error(`Error in portal request-code`, error);
    }

    return genericResponse;
  }

  /**
   * Find a portal user by email within the workspace.
   * A "portal user" is a User with a partyId, where the party has GUARDIAN or STUDENT role
   * and belongs to the given tenant.
   */
  private async findPortalUserByEmail(
    tenantId: string,
    _workspaceId: string,
    emailNormalized: string
  ): Promise<{ userId: string; partyId: string; roles: string[] } | null> {
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

    const partyRoles = await this.prisma.partyRole.findMany({
      where: {
        tenantId,
        partyId: user.partyId,
        role: { in: ["GUARDIAN", "STUDENT"] },
      },
    });

    if (partyRoles.length === 0) {
      return null;
    }

    return {
      userId: user.id,
      partyId: user.partyId,
      roles: partyRoles.map((r) => r.role),
    };
  }
}
