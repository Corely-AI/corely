import { Injectable } from "@nestjs/common";
import type { TransactionContext } from "@corely/kernel";
import { PrismaService, getPrismaClient } from "@corely/data";
import type { StaffLinkLookup, StaffLinkScope } from "@corely/contracts";
import { AuthorizeWorkspaceUseCase } from "../../../workspaces/public";
@Injectable()
export class StaffAccountLookupAdapter implements StaffLinkLookup {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: AuthorizeWorkspaceUseCase
  ) {}
  async exists(scope: StaffLinkScope, id: string, tx?: TransactionContext): Promise<boolean> {
    if (
      !(await getPrismaClient(this.prisma, tx).membership.findFirst({
        where: { tenantId: scope.tenantId, userId: id, user: { status: "ACTIVE" } },
        select: { id: true },
      }))
    ) {
      return false;
    }
    try {
      await this.workspaces.execute({ ...scope, userId: id }, tx);
      return true;
    } catch {
      return false;
    }
  }
}
