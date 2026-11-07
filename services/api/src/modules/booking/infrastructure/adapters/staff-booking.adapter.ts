import { Injectable } from "@nestjs/common";
import { PrismaService, getPrismaClient } from "@corely/data";
import type { StaffLinkScope, StaffCommitment } from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";

@Injectable()
export class StaffBookingAdapter {
  constructor(private readonly prisma: PrismaService) {}
  async lock(scope: StaffLinkScope, ids: string[], tx: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    for (const id of [...new Set(ids)].sort()) {
      await client.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${scope.tenantId}:${id}`}, 0))::text`;
    }
  }
  async commitments(
    scope: StaffLinkScope,
    resourceId: string,
    from: Date,
    tx?: TransactionContext
  ): Promise<StaffCommitment[]> {
    const client = getPrismaClient(this.prisma, tx);
    const [allocations, holds] = await Promise.all([
      client.bookingAllocation.findMany({
        where: {
          tenantId: scope.tenantId,
          resourceId,
          endAt: { gt: from },
          startAt: { gte: from },
          booking: {
            workspaceId: scope.workspaceId,
            status: { in: ["CONFIRMED", "HOLD"] },
          },
        },
        select: { bookingId: true, startAt: true, endAt: true },
      }),
      client.bookingHold.findMany({
        where: {
          tenantId: scope.tenantId,
          workspaceId: scope.workspaceId,
          resourceIds: { has: resourceId },
          status: "ACTIVE",
          expiresAt: { gt: from },
          startAt: { gte: from },
        },
        select: { id: true, startAt: true, endAt: true },
      }),
    ]);
    return [
      ...allocations.map((a) => ({
        id: a.bookingId,
        kind: "booking" as const,
        startAt: a.startAt.toISOString(),
        endAt: a.endAt.toISOString(),
      })),
      ...holds.map((h) => ({
        id: h.id,
        kind: "hold" as const,
        startAt: h.startAt.toISOString(),
        endAt: h.endAt.toISOString(),
      })),
    ];
  }
}
