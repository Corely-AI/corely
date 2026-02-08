import { Injectable, Logger } from "@nestjs/common";
import { createHash } from "crypto";
import type { PortalSessionRepositoryPort } from "../ports/portal-session.port";
import type { AuditPort } from "../../../identity/application/ports/audit.port";

export interface PortalLogoutInput {
  refreshToken: string;
  tenantId?: string;
  userId?: string;
}

@Injectable()
export class PortalLogoutUseCase {
  private readonly logger = new Logger(PortalLogoutUseCase.name);

  constructor(
    private readonly sessionRepo: PortalSessionRepositoryPort,
    private readonly audit: AuditPort
  ) {}

  async execute(input: PortalLogoutInput): Promise<{ message: string }> {
    const tokenHash = createHash("sha256").update(input.refreshToken).digest("hex");

    const session = await this.sessionRepo.findValidByHash(tokenHash);
    if (session) {
      await this.sessionRepo.revoke(session.id);

      await this.audit.write({
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: "portal.logout",
        targetType: "PortalSession",
        targetId: session.id,
      });
    }

    return { message: "Logged out" };
  }
}
