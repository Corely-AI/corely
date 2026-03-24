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
    const workspaceId = ctx.tenantId!;
    const tenantId =
      typeof ctx.metadata?.platformTenantId === "string"
        ? ctx.metadata.platformTenantId
        : (ctx.workspaceId ?? ctx.tenantId!);

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
      const cashManagementContext = {
        ...ctx,
        tenantId,
        workspaceId,
      };
      const dayCloseResult = await this.submitDailyCloseUC.execute(
        {
          tenantId,
          registerId: session.registerId,
          businessDate: new Date().toISOString().split("T")[0],
          countedBalanceCents: input.closingCashCents,
          denominationCounts: [],
          notes: input.notes ?? `POS Shift Closed by ${ctx.userId}`,
        },
        cashManagementContext
      );

      if ("error" in dayCloseResult) {
        if (this.isMissingCashRegisterError(dayCloseResult.error)) {
          const createRegisterResult = await this.createRegisterUC.execute(
            {
              tenantId,
              name: `POS Register ${session.registerId.slice(0, 8)}`,
              currency: "EUR",
            },
            cashManagementContext
          );

          if ("error" in createRegisterResult) {
            return err(createRegisterResult.error);
          }

          const retryResult = await this.submitDailyCloseUC.execute(
            {
              tenantId,
              registerId: session.registerId,
              businessDate: new Date().toISOString().split("T")[0],
              countedBalanceCents: input.closingCashCents,
              denominationCounts: [],
              notes: input.notes ?? `POS Shift Closed by ${ctx.userId}`,
            },
            cashManagementContext
          );
          if ("error" in retryResult) {
            return err(retryResult.error);
          }
        } else {
          return err(dayCloseResult.error);
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

  private isMissingCashRegisterError(error: UseCaseError): boolean {
    return (
      error.code === "CashManagement:RegisterNotFound" ||
      error.message === "Cash register not found"
    );
  }
}
