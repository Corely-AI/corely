import { Inject, Injectable } from "@nestjs/common";
import type { CloseShiftInput, CloseShiftOutput } from "@kerniflow/contracts";
import {
  BaseUseCase,
  type Context,
  type Result,
  Ok,
  Err,
  NotFoundError,
  ConflictError,
} from "@kerniflow/kernel";
import {
  SHIFT_SESSION_REPOSITORY_PORT,
  type ShiftSessionRepositoryPort,
} from "../ports/shift-session-repository.port";

@Injectable()
export class CloseShiftUseCase extends BaseUseCase<CloseShiftInput, CloseShiftOutput> {
  constructor(
    @Inject(SHIFT_SESSION_REPOSITORY_PORT) private shiftRepo: ShiftSessionRepositoryPort
  ) {
    super();
  }

  async executeImpl(input: CloseShiftInput, ctx: Context): Promise<Result<CloseShiftOutput>> {
    // Find session
    const session = await this.shiftRepo.findById(ctx.workspaceId, input.sessionId);
    if (!session) {
      return Err(new NotFoundError("SESSION_NOT_FOUND", "Shift session not found"));
    }

    if (session.status === "CLOSED") {
      return Err(new ConflictError("SESSION_ALREADY_CLOSED", "Shift session is already closed"));
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

    return Ok({
      sessionId: session.id,
      status: "CLOSED",
      closedAt: session.closedAt!,
      totalSalesCents: session.totalSalesCents,
      totalCashReceivedCents: session.totalCashReceivedCents,
      varianceCents: session.varianceCents,
    });
  }
}
