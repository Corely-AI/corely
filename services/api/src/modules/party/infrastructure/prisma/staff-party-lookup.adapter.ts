import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { StaffLinkLookup, StaffLinkScope } from "@corely/contracts";
@Injectable()
export class StaffPartyLookupAdapter implements StaffLinkLookup {
  constructor(private readonly prisma: PrismaService) {}
  async exists(scope: StaffLinkScope, id: string): Promise<boolean> {
    // Party is tenant-owned, with no workspace column. Linking never copies its contacts.
    return Boolean(
      await this.prisma.party.findFirst({
        where: { id, tenantId: scope.tenantId, kind: "INDIVIDUAL", archivedAt: null },
        select: { id: true },
      })
    );
  }
}
