import { Inject, Injectable } from "@nestjs/common";
import { CashDayCloseStatus, type SubmitCashDayCloseInput } from "@corely/contracts";
import {
  AUDIT_PORT,
  BaseUseCase,
  UNIT_OF_WORK,
  NotFoundError,
  ValidationError,
  type AuditPort,
  type Result,
  type UnitOfWorkPort,
  type UseCaseContext,
  type UseCaseError,
  RequireTenant,
  ok,
} from "@corely/kernel";
import {
  CASH_DAY_CLOSE_REPO,
  CASH_ENTRY_REPO,
  CASH_REGISTER_REPO,
  type CashDayCloseRepoPort,
  type CashEntryRepoPort,
  type CashRegisterRepoPort,
} from "../ports/cash-management.ports";
import { toDayCloseDto } from "../cash-management.mapper";
import { assertCanCloseCash } from "../../policies/assert-cash-policies";

@RequireTenant()
@Injectable()
export class SaveCashDayCountUseCase extends BaseUseCase<
  SubmitCashDayCloseInput,
  { dayClose: ReturnType<typeof toDayCloseDto> }
> {
  constructor(
    @Inject(CASH_REGISTER_REPO)
    private readonly registerRepo: CashRegisterRepoPort,
    @Inject(CASH_ENTRY_REPO)
    private readonly entryRepo: CashEntryRepoPort,
    @Inject(CASH_DAY_CLOSE_REPO)
    private readonly dayCloseRepo: CashDayCloseRepoPort,
    @Inject(AUDIT_PORT)
    private readonly audit: AuditPort,
    @Inject(UNIT_OF_WORK)
    private readonly unitOfWork: UnitOfWorkPort
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: SubmitCashDayCloseInput,
    ctx: UseCaseContext
  ): Promise<Result<{ dayClose: ReturnType<typeof toDayCloseDto> }, UseCaseError>> {
    const tenantId = ctx.tenantId;
    const workspaceId = ctx.workspaceId;
    if (!tenantId || !workspaceId) {
      throw new ValidationError("Missing tenant/workspace context");
    }

    assertCanCloseCash(ctx, input.registerId);

    const dayKey = input.dayKey ?? input.businessDate;
    if (!dayKey) {
      throw new ValidationError("dayKey is required", undefined, "CashManagement:InvalidInput");
    }

    const register = await this.registerRepo.findRegisterById(
      tenantId,
      workspaceId,
      input.registerId
    );
    if (!register) {
      throw new NotFoundError(
        "Cash register not found",
        undefined,
        "CashManagement:RegisterNotFound"
      );
    }

    const existing = await this.dayCloseRepo.findDayCloseByRegisterAndDay(
      tenantId,
      workspaceId,
      register.id,
      dayKey
    );
    if (existing?.status === CashDayCloseStatus.SUBMITTED) {
      throw new ValidationError(
        "Day is already closed",
        { dayCloseId: existing.id, dayKey },
        "CashManagement:DayAlreadyClosed"
      );
    }

    const expectedBalance = await this.entryRepo.getExpectedBalanceAtDay(
      tenantId,
      workspaceId,
      register.id,
      dayKey
    );

    const countedFromLines = input.denominationCounts.reduce(
      (total, line) => total + line.subtotal,
      0
    );
    const countedBalance = input.countedBalance ?? input.countedBalanceCents ?? countedFromLines;
    const note = input.note ?? input.notes ?? null;
    const difference = countedBalance - expectedBalance;

    const dayClose = await this.unitOfWork.withinTransaction(async (tx) => {
      const close = await this.dayCloseRepo.upsertDayClose(
        {
          id: existing?.id,
          tenantId,
          workspaceId,
          registerId: register.id,
          dayKey,
          status: CashDayCloseStatus.DRAFT,
          expectedBalanceCents: expectedBalance,
          countedBalanceCents: countedBalance,
          differenceCents: difference,
          note,
          submittedAt: null,
          submittedByUserId: null,
          lockedAt: null,
          lockedByUserId: null,
        },
        tx
      );

      await this.dayCloseRepo.replaceCountLines(
        tenantId,
        workspaceId,
        close.id,
        input.denominationCounts.map((line) => ({
          denominationCents: line.denomination,
          count: line.count,
          subtotalCents: line.subtotal,
        })),
        tx
      );

      await this.audit.log(
        {
          tenantId,
          userId: ctx.userId ?? "system",
          action: "cash.day-count.saved",
          entityType: "CashDayClose",
          entityId: close.id,
          metadata: {
            registerId: close.registerId,
            dayKey: close.dayKey,
            expectedBalanceCents: close.expectedBalanceCents,
            countedBalanceCents: close.countedBalanceCents,
            differenceCents: close.differenceCents,
          },
        },
        tx
      );

      return close;
    });

    const refreshed = await this.dayCloseRepo.findDayCloseByRegisterAndDay(
      tenantId,
      workspaceId,
      register.id,
      dayKey
    );

    return ok({ dayClose: toDayCloseDto(refreshed ?? dayClose) });
  }
}
