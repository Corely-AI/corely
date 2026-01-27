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
import type { ClosePeriodInput, ClosePeriodOutput } from "@corely/contracts";
import type { BaseDeps } from "./accounting-use-case.deps";
import { mapPeriodToDto } from "../mappers/accounting.mapper";

export class ClosePeriodUseCase extends BaseUseCase<ClosePeriodInput, ClosePeriodOutput> {
  constructor(protected readonly deps: BaseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ClosePeriodInput,
    ctx: UseCaseContext
  ): Promise<Result<ClosePeriodOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const period = await this.deps.periodRepo.findById(ctx.tenantId, input.periodId);
    if (!period) {
      return err(new NotFoundError("Period not found"));
    }

    const now = this.deps.clock.now();

    try {
      period.close(ctx.userId, now);
    } catch (error) {
      return err(new ValidationError((error as Error).message));
    }

    await this.deps.periodRepo.save(period);

    return ok({ period: mapPeriodToDto(period) });
  }
}
