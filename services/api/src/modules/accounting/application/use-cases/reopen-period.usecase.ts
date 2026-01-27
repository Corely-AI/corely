import {
  BaseUseCase,
  type UseCaseContext,
  type UseCaseError,
  type Result,
  ok,
  err,
  ValidationError,
  NotFoundError,
} from "@corely/kernel";
import type { ReopenPeriodInput, ReopenPeriodOutput } from "@corely/contracts";
import type { BaseDeps } from "./accounting-use-case.deps";
import { mapPeriodToDto } from "../mappers/accounting.mapper";

export class ReopenPeriodUseCase extends BaseUseCase<ReopenPeriodInput, ReopenPeriodOutput> {
  constructor(protected readonly deps: BaseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ReopenPeriodInput,
    ctx: UseCaseContext
  ): Promise<Result<ReopenPeriodOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const period = await this.deps.periodRepo.findById(ctx.tenantId, input.periodId);
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
