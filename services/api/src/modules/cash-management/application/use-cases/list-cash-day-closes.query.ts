import { Inject, Injectable } from "@nestjs/common";
import type { ListCashDayClosesQuery } from "@corely/contracts";
import {
  BaseUseCase,
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
export class ListCashDayClosesQueryUseCase extends BaseUseCase<
  ListCashDayClosesQuery,
  { closes: ReturnType<typeof toDayCloseDto>[] }
> {
  constructor(
    @Inject(CASH_DAY_CLOSE_REPO)
    private readonly dayCloseRepo: CashDayCloseRepoPort
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: ListCashDayClosesQuery,
    ctx: UseCaseContext
  ): Promise<Result<{ closes: ReturnType<typeof toDayCloseDto>[] }, UseCaseError>> {
    assertCanManageCash(ctx, input.registerId);

    const tenantId = ctx.tenantId;
    const workspaceId = ctx.workspaceId;
    if (!tenantId || !workspaceId) {
      throw new ValidationError("Missing tenant/workspace context");
    }

    const closes = await this.dayCloseRepo.listDayCloses(tenantId, workspaceId, {
      registerId: input.registerId,
      dayKeyFrom: input.dayKeyFrom,
      dayKeyTo: input.dayKeyTo,
      status: input.status,
    });

    return ok({ closes: closes.map(toDayCloseDto) });
  }
}
