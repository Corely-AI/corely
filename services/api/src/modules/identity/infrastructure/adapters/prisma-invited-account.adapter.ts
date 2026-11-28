import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService, getPrismaClient } from "@corely/data";
import type { TransactionContext } from "@corely/kernel";
import type { InvitedAccountPort } from "../../application/ports/invited-account.port";

@Injectable()
export class PrismaInvitedAccountAdapter implements InvitedAccountPort {
  constructor(private readonly prisma: PrismaService) {}
  async ensureTenantMember(
    tenantId: string,
    userId: string,
    tx: TransactionContext,
    allowCreate: boolean
  ) {
    const client = getPrismaClient(this.prisma, tx);
    await client.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`identity:invited:${tenantId}:${userId}`}, 0))::text`;
    const tenant = await client.tenant.findFirst({ where: { id: tenantId, status: "ACTIVE" } });
    if (!tenant) {
      throw new ForbiddenException("Tenant unavailable");
    }
    if (await client.membership.findFirst({ where: { tenantId, userId } })) {
      return false;
    }
    if (!allowCreate) {
      throw new ForbiddenException("Invitation no longer grants access");
    }
    const role = await client.role.findUnique({
      where: { tenantId_systemKey: { tenantId, systemKey: "STAFF" } },
    });
    if (!role) {
      throw new ForbiddenException("Staff role is not configured");
    }
    await client.membership.create({ data: { tenantId, userId, roleId: role.id } });
    return true;
  }
}
