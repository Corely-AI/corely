import { Inject, Injectable } from "@nestjs/common";
import type { CloseShiftInput, CloseShiftOutput } from "@corely/contracts";
import {
  BaseUseCase,
  ConflictError,
  NoopLogger,
  NotFoundError,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  err,
  ok,
  RequireTenant,
} from "@corely/kernel";
import {
  SHIFT_SESSION_REPOSITORY_PORT,
  type ShiftSessionRepositoryPort,
} from "../ports/shift-session-repository.port";

import { SubmitDailyCloseUseCase } from "../../../cash-management/application/use-cases/submit-daily-close.usecase";
import { CreateRegisterUseCase } from "../../../cash-management/application/use-cases/create-register.usecase";

@RequireTenant()
@Injectable()
export class CloseShiftUseCase extends BaseUseCase<CloseShiftInput, CloseShiftOutput> {
  constructor(
    @Inject(SHIFT_SESSION_REPOSITORY_PORT) private shiftRepo: ShiftSessionRepositoryPort,
    private readonly submitDailyCloseUC: SubmitDailyCloseUseCase,
    private readonly createRegisterUC: CreateRegisterUseCase
  ) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: CloseShiftInput,
    ctx: UseCaseContext
  ): Promise<Result<CloseShiftOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    // Find session
    const session = await this.shiftRepo.findById(tenantId, input.sessionId);
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
      try {
        await this.submitDailyCloseUC.execute(
          {
            tenantId,
            registerId: session.registerId,
            businessDate: new Date().toISOString().split("T")[0],
            countedBalanceCents: input.closingCashCents,
            notes: input.notes ?? `POS Shift Closed by ${ctx.userId}`,
          },
          ctx
        );
      } catch (error: unknown) {
        // If register missing, we try to create it then retry (Auto-healing)
        const err = error as Error;
        if (err?.message === "Cash Register not found") {
          await this.createRegisterUC.execute(
            {
              tenantId,
              name: `POS Register ${session.registerId.slice(0, 8)}`,
              currency: "EUR",
            },
            ctx
          );

          // Retry close
          await this.submitDailyCloseUC.execute(
            {
              tenantId,
              registerId: session.registerId,
              businessDate: new Date().toISOString().split("T")[0],
              countedBalanceCents: input.closingCashCents,
              notes: input.notes ?? `POS Shift Closed by ${ctx.userId}`,
            },
            ctx
          );
        } else {
          // Log but don't fail the POS close? Or fail?
          // "Prevent double-posting...".
          // If Cash Mgmt fails, we probably should warn but maybe not rollback POS close if it's already done?
          // Actually, we haven't returned yet.
          // Let's log error but proceed, or throw?
          // Throwing is safer data-integrity wise.
          throw error;
        }
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
