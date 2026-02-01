import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { CreateCashRegister } from "@corely/contracts";
import { type CashRepositoryPort, CASH_REPOSITORY } from "../ports/cash-repository.port";
import type { CashRegisterEntity } from "../../domain/entities";
import { Inject, Injectable } from "@nestjs/common";

@RequireTenant()
@Injectable()
export class CreateRegisterUseCase extends BaseUseCase<CreateCashRegister, CashRegisterEntity> {
  constructor(@Inject(CASH_REPOSITORY) private readonly repository: CashRepositoryPort) {
    super({ logger: null as any });
  }

  protected async handle(
    input: CreateCashRegister,
    ctx: UseCaseContext
  ): Promise<Result<CashRegisterEntity, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const register = await this.repository.createRegister({
      ...input,
      tenantId,
      workspaceId: ctx.workspaceId || tenantId,
    });

    return ok(register);
  }
}
