import { Inject, Injectable } from "@nestjs/common";
import type { CloseShiftInput, CloseShiftOutput } from "@corely/contracts";
import {
  BaseUseCase,
  ConflictError,
  NoopLogger,
  NotFoundError,
  isErr,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  err,
  ok,
  RequireTenant,
} from "@corely/kernel";
import {
  SHIFT_SESSION_REPOSITORY_PORT,
  type ShiftSessionRepositoryPort,
} from "../ports/shift-session-repository.port";

import { SubmitDailyCloseUseCase } from "../../../cash-management/application/use-cases/submit-daily-close.usecase";
import { ResolveCashDrawerForPosRegisterService } from "../services/resolve-cash-drawer-for-pos-register.service";

@RequireTenant()
@Injectable()
export class CloseShiftUseCase extends BaseUseCase<CloseShiftInput, CloseShiftOutput> {
  constructor(
    @Inject(SHIFT_SESSION_REPOSITORY_PORT) private shiftRepo: ShiftSessionRepositoryPort,
    private readonly submitDailyCloseUC: SubmitDailyCloseUseCase,
    private readonly resolveCashDrawer: ResolveCashDrawerForPosRegisterService
  ) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: CloseShiftInput,
    ctx: UseCaseContext
  ): Promise<Result<CloseShiftOutput, UseCaseError>> {
    const workspaceId = ctx.tenantId!;

    // Find session
    const session = await this.shiftRepo.findById(workspaceId, input.sessionId);
    if (!session) {
      return err(new NotFoundError("SESSION_NOT_FOUND", "Shift session not found"));
    }

    if (session.status === "CLOSED") {
      return err(new ConflictError("SESSION_ALREADY_CLOSED", "Shift session is already closed"));
    }

    // TODO: Calculate totals from synced POS sales
    // For now, use values from session (will be updated by sync endpoint)
    const totalSalesCents = session.totalSalesCents;
    const totalCashReceivedCents = session.totalCashReceivedCents;

    // Close the session
    session.close({
      closedByEmployeePartyId: ctx.userId,
      closingCashCents: input.closingCashCents ?? null,
      totalSalesCents,
      totalCashReceivedCents,
      notes: input.notes,
    });

    // Save updated session
    await this.shiftRepo.update(session);

    // Bridge to Cash Management: Submit Daily Close
    // This ensures that the POS Shift Close is reflected in the central ledger
    if (input.closingCashCents !== null && input.closingCashCents !== undefined) {
      const cashDrawerResult = await this.resolveCashDrawer.execute(
        {
          posRegisterId: session.registerId,
          autoCreate: true,
          cashDrawerName: `Cash Drawer ${session.registerId.slice(0, 8)}`,
          currency: "EUR",
          idempotencyKey: `pos-register-cash-drawer:${workspaceId}:${session.registerId}`,
        },
        ctx
      );
      if (isErr(cashDrawerResult)) {
        return err(cashDrawerResult.error);
      }

      const { cashDrawerId, scope } = cashDrawerResult.value;
      const dayCloseResult = await this.submitDailyCloseUC.execute(
        {
          tenantId: scope.cashTenantId,
          registerId: cashDrawerId,
          businessDate: new Date().toISOString().split("T")[0],
          countedBalanceCents: input.closingCashCents,
          denominationCounts: [],
          notes: input.notes ?? `POS Shift Closed by ${ctx.userId}`,
        },
        scope.cashManagementContext
      );

      if ("error" in dayCloseResult) {
        return err(dayCloseResult.error);
      }
    }

    return ok({
      sessionId: session.id,
      status: "CLOSED",
      closedAt: session.closedAt ?? new Date(),
      totalSalesCents: session.totalSalesCents,
      totalCashReceivedCents: session.totalCashReceivedCents,
      varianceCents: session.varianceCents,
    });
  }
}
