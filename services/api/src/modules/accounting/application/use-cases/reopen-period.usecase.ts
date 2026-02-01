import {
  BaseUseCase,
  type UseCaseContext,
  type UseCaseError,
  type Result,
  ok,
  err,
  ValidationError,
  NotFoundError,
  RequireTenant,
} from "@corely/kernel";
import type { ReopenPeriodInput, ReopenPeriodOutput } from "@corely/contracts";
import type { BaseDeps } from "./accounting-use-case.deps";
import { mapPeriodToDto } from "../mappers/accounting.mapper";

@RequireTenant()
export class ReopenPeriodUseCase extends BaseUseCase<ReopenPeriodInput, ReopenPeriodOutput> {
  constructor(protected readonly deps: BaseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ReopenPeriodInput,
    ctx: UseCaseContext
  ): Promise<Result<ReopenPeriodOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const period = await this.deps.periodRepo.findById(tenantId, input.periodId);
    if (!period) {
      return err(new NotFoundError("Period not found"));
    }

    const now = this.deps.clock.now();

    try {
      period.reopen(now);
    } catch (error) {
      return err(new ValidationError((error as Error).message));
    }

    await this.deps.periodRepo.save(period);

    return ok({ period: mapPeriodToDto(period) });
  }
}
