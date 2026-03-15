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
import { CASH_ENTRY_REPO, type CashEntryRepoPort } from "../ports/cash-management.ports";
import { toEntryDto } from "../cash-management.mapper";
import { assertCanManageCash } from "../../policies/assert-cash-policies";

@RequireTenant()
@Injectable()
export class GetCashEntryQueryUseCase extends BaseUseCase<
  { entryId: string },
  { entry: ReturnType<typeof toEntryDto> }
> {
  constructor(
    @Inject(CASH_ENTRY_REPO)
    private readonly entryRepo: CashEntryRepoPort
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: { entryId: string },
    ctx: UseCaseContext
  ): Promise<Result<{ entry: ReturnType<typeof toEntryDto> }, UseCaseError>> {
    const tenantId = ctx.tenantId;
    const workspaceId = ctx.workspaceId;
    if (!tenantId || !workspaceId) {
      throw new ValidationError("Missing tenant/workspace context");
    }

    const entry = await this.entryRepo.findEntryById(tenantId, workspaceId, input.entryId);
    if (!entry) {
      throw new NotFoundError("Cash entry not found", undefined, "CashManagement:EntryNotFound");
    }

    assertCanManageCash(ctx, entry.registerId);

    return ok({ entry: toEntryDto(entry) });
  }
}
