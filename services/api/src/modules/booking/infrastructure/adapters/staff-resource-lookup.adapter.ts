import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { StaffLinkLookup, StaffLinkScope } from "@corely/contracts";
@Injectable()
export class StaffResourceLookupAdapter implements StaffLinkLookup {
  constructor(private readonly prisma: PrismaService) {}
  async exists(scope: StaffLinkScope, id: string): Promise<boolean> {
    // Unscoped legacy resources cannot become workspace authority via a People link.
    return Boolean(
      await this.prisma.bookingResource.findFirst({
        where: { id, ...scope, type: "STAFF", isActive: true },
        select: { id: true },
      })
    );
  }
}
