import { Inject, Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  RequireTenant,
  ValidationError,
  ok,
} from "@corely/kernel";
import type { ListCashEntriesQuery } from "@corely/contracts";
import { CASH_ENTRY_REPO, type CashEntryRepoPort } from "../ports/cash-management.ports";
import { toEntryDto } from "../cash-management.mapper";
import { assertCanManageCash } from "../../policies/assert-cash-policies";

@RequireTenant()
@Injectable()
export class ListCashEntriesQueryUseCase extends BaseUseCase<
  ListCashEntriesQuery,
  { entries: ReturnType<typeof toEntryDto>[] }
> {
  constructor(
    @Inject(CASH_ENTRY_REPO)
    private readonly entryRepo: CashEntryRepoPort
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: ListCashEntriesQuery,
    ctx: UseCaseContext
  ): Promise<Result<{ entries: ReturnType<typeof toEntryDto>[] }, UseCaseError>> {
    assertCanManageCash(ctx, input.registerId);

    const tenantId = ctx.tenantId;
    const workspaceId = ctx.workspaceId;
    if (!tenantId || !workspaceId) {
      throw new ValidationError("Missing tenant/workspace context");
    }

    const entries = await this.entryRepo.listEntries(tenantId, workspaceId, {
      registerId: input.registerId,
      dayKeyFrom: input.dayKeyFrom,
      dayKeyTo: input.dayKeyTo,
      type: input.type,
      source: input.source,
      paymentMethod: input.paymentMethod,
      q: input.q,
    });

    return ok({ entries: entries.map(toEntryDto) });
  }
}
