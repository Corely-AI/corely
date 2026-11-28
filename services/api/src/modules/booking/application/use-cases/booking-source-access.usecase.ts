import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import type { TransactionContext, UseCaseContext } from "@corely/kernel";
import { TenantEntitlementService } from "../../../platform/public";
import { AuthorizeWorkspaceUseCase } from "../../../workspaces/public";
import { BOOKING_REPOSITORY, type BookingRepositoryPort } from "../ports/booking-repo.ports";

@Injectable()
export class BookingSourceAccess {
  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookings: BookingRepositoryPort,
    private readonly workspaces: AuthorizeWorkspaceUseCase,
    private readonly entitlements: TenantEntitlementService
  ) {}

  async canRead(id: string, ctx: UseCaseContext, tx?: TransactionContext): Promise<boolean> {
    if (!ctx.tenantId || !ctx.workspaceId || !ctx.userId) {
      return false;
    }
    try {
      await this.workspaces.execute(
        { tenantId: ctx.tenantId, workspaceId: ctx.workspaceId, userId: ctx.userId, manage: true },
        tx
      );
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return false;
      }
      throw error;
    }
    if (!(await this.entitlements.isAppEnabled(ctx.tenantId, "booking", tx))) {
      return false;
    }
    const booking = await this.bookings.findById(id, ctx.tenantId, tx);
    return booking?.workspaceId === ctx.workspaceId;
  }
}
