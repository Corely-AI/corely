import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { StaffLinkLookup, StaffLinkScope } from "@corely/contracts";
import { AuthorizeWorkspaceUseCase } from "../../../workspaces/public";
@Injectable()
export class StaffAccountLookupAdapter implements StaffLinkLookup {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: AuthorizeWorkspaceUseCase
  ) {}
  async exists(scope: StaffLinkScope, id: string): Promise<boolean> {
    if (
      !(await this.prisma.membership.findFirst({
        where: { tenantId: scope.tenantId, userId: id, user: { status: "ACTIVE" } },
        select: { id: true },
      }))
    ) {
      return false;
    }
    try {
      await this.workspaces.execute({ ...scope, userId: id });
      return true;
    } catch {
      return false;
    }
  }
}
