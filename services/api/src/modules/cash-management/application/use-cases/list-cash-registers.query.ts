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
import { type ListCashRegistersQuery } from "@corely/contracts";
import { type CashRegisterRepoPort, CASH_REGISTER_REPO } from "../ports/cash-management.ports";
import { toRegisterDto } from "../cash-management.mapper";

@RequireTenant()
@Injectable()
export class ListCashRegistersQueryUseCase extends BaseUseCase<
  ListCashRegistersQuery,
  { registers: ReturnType<typeof toRegisterDto>[] }
> {
  constructor(
    @Inject(CASH_REGISTER_REPO)
    private readonly registerRepo: CashRegisterRepoPort
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: ListCashRegistersQuery,
    ctx: UseCaseContext
  ): Promise<Result<{ registers: ReturnType<typeof toRegisterDto>[] }, UseCaseError>> {
    const tenantId = ctx.tenantId;
    const workspaceId = ctx.workspaceId;
    if (!tenantId || !workspaceId) {
      throw new ValidationError("Missing tenant/workspace context");
    }

    const registers = await this.registerRepo.listRegisters(tenantId, workspaceId, input);
    return ok({ registers: registers.map(toRegisterDto) });
  }
}
