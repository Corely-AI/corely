import { Injectable } from "@nestjs/common";
import type { TransactionContext } from "@corely/kernel";
import { PrismaService, getPrismaClient } from "@corely/data";
import type { StaffLinkLookup, StaffLinkScope } from "@corely/contracts";
@Injectable()
export class StaffResourceLookupAdapter implements StaffLinkLookup {
  constructor(private readonly prisma: PrismaService) {}
  async exists(scope: StaffLinkScope, id: string, tx?: TransactionContext): Promise<boolean> {
    // Unscoped legacy resources cannot become workspace authority via a People link.
    return Boolean(
      await getPrismaClient(this.prisma, tx).bookingResource.findFirst({
        where: { id, ...scope, type: "STAFF", isActive: true },
        select: { id: true },
      })
    );
  }
}
