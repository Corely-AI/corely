import { Inject, Injectable } from "@nestjs/common";
import type { ListRegistersInput, ListRegistersOutput } from "@corely/contracts";
import {
  BaseUseCase,
  NoopLogger,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  ok,
  err,
  RequireTenant,
} from "@corely/kernel";
import {
  REGISTER_REPOSITORY_PORT,
  type RegisterRepositoryPort,
} from "../ports/register-repository.port";

@RequireTenant()
@Injectable()
export class ListRegistersUseCase extends BaseUseCase<ListRegistersInput, ListRegistersOutput> {
  constructor(@Inject(REGISTER_REPOSITORY_PORT) private registerRepo: RegisterRepositoryPort) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: ListRegistersInput,
    ctx: UseCaseContext
  ): Promise<Result<ListRegistersOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const registers = await this.registerRepo.findByWorkspace(tenantId, input.status);

    return ok({
      registers: registers.map((r) => r.toDto()),
    });
  }
}
