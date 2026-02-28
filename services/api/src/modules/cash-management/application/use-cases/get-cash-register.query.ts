import { Inject, Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  RequireTenant,
  NotFoundError,
  ValidationError,
  err,
  ok,
} from "@corely/kernel";
import { type CashRegisterRepoPort, CASH_REGISTER_REPO } from "../ports/cash-management.ports";
import { toRegisterDto } from "../cash-management.mapper";

@RequireTenant()
@Injectable()
export class GetCashRegisterQueryUseCase extends BaseUseCase<
  { registerId: string },
  { register: ReturnType<typeof toRegisterDto> }
> {
  constructor(
    @Inject(CASH_REGISTER_REPO)
    private readonly registerRepo: CashRegisterRepoPort
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: { registerId: string },
    ctx: UseCaseContext
  ): Promise<Result<{ register: ReturnType<typeof toRegisterDto> }, UseCaseError>> {
    const tenantId = ctx.tenantId;
    const workspaceId = ctx.workspaceId;
    if (!tenantId || !workspaceId) {
      throw new ValidationError("Missing tenant/workspace context");
    }

    const register = await this.registerRepo.findRegisterById(
      tenantId,
      workspaceId,
      input.registerId
    );

    if (!register) {
      return err(
        new NotFoundError("Cash register not found", undefined, "CashManagement:RegisterNotFound")
      );
    }

    return ok({ register: toRegisterDto(register) });
  }
}
