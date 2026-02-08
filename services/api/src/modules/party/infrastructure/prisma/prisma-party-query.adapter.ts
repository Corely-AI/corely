import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import {
  PartyQueryPort,
  PartyLifecycleTransitionDTO,
} from "../../application/ports/party-query.port";

@Injectable()
export class PrismaPartyQueryAdapter implements PartyQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getLifecycleHistory(
    tenantId: string,
    partyId: string
  ): Promise<PartyLifecycleTransitionDTO[]> {
    const rows = await (this.prisma as any).partyLifecycleTransition.findMany({
      where: { tenantId, partyId },
      orderBy: { changedAt: "desc" },
    });

    return rows.map((row) => ({
      id: row.id,
      fromStatus: row.fromStatus as any,
      toStatus: row.toStatus as any,
      reason: row.reason,
      changedByUserId: row.changedByUserId,
      changedAt: row.changedAt,
    }));
  }
}
