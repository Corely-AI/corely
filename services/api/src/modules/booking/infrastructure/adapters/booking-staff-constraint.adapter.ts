import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService, getPrismaClient } from "@corely/data";
import type { TransactionContext } from "@corely/kernel";
import { StaffAvailabilityConstraintService } from "../../../people/public";

@Injectable()
export class BookingStaffConstraintAdapter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staff: StaffAvailabilityConstraintService
  ) {}
  async assertAvailable(
    tenantId: string,
    workspaceId: string | null,
    resourceId: string,
    from: Date,
    to: Date,
    tx: TransactionContext
  ) {
    const resource = await getPrismaClient(this.prisma, tx).bookingResource.findFirst({
      where: { id: resourceId, tenantId, isActive: true },
      select: { workspaceId: true },
    });
    if (!resource || (resource.workspaceId && resource.workspaceId !== workspaceId)) {
      throw new BadRequestException("Resource is unavailable in this workspace");
    }
    if (resource.workspaceId) {
      await this.staff.assertAvailable(
        { tenantId, workspaceId: resource.workspaceId },
        resourceId,
        from,
        to,
        tx
      );
    }
  }
}
