import { Inject, Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  NotFoundError,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  RequireTenant,
  ok,
} from "@corely/kernel";
import { CASH_DAY_CLOSE_REPO, type CashDayCloseRepoPort } from "../ports/cash-management.ports";
import { toDayCloseDto } from "../cash-management.mapper";
import { assertCanManageCash } from "../../policies/assert-cash-policies";

@RequireTenant()
@Injectable()
export class GetCashDayCloseQueryUseCase extends BaseUseCase<
  { registerId: string; dayKey: string },
  { dayClose: ReturnType<typeof toDayCloseDto> }
> {
  constructor(
    @Inject(CASH_DAY_CLOSE_REPO)
    private readonly dayCloseRepo: CashDayCloseRepoPort
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: { registerId: string; dayKey: string },
    ctx: UseCaseContext
  ): Promise<Result<{ dayClose: ReturnType<typeof toDayCloseDto> }, UseCaseError>> {
    assertCanManageCash(ctx, input.registerId);

    const tenantId = ctx.tenantId;
    const workspaceId = ctx.workspaceId;
    if (!tenantId || !workspaceId) {
      throw new ValidationError("Missing tenant/workspace context");
    }

    const dayClose = await this.dayCloseRepo.findDayCloseByRegisterAndDay(
      tenantId,
      workspaceId,
      input.registerId,
      input.dayKey
    );

    if (!dayClose) {
      throw new NotFoundError("Day close not found", undefined, "CashManagement:DayCloseNotFound");
    }

    return ok({ dayClose: toDayCloseDto(dayClose) });
  }
}
