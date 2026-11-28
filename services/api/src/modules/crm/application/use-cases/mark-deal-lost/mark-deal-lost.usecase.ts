import { Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  type ClockPort,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  RequireTenant,
  ok,
  err,
} from "@corely/kernel";
import {
  DEAL_LOSS_POLICY_REJECTED,
  dealLossRejection,
  type DealLossRegistration,
} from "@corely/crm/extensions";
import type { MarkDealLostInput, MarkDealLostOutput } from "@corely/contracts";
import type { DealRepoPort } from "../../ports/deal-repository.port";
import type { EnrollmentRepoPort } from "../../ports/enrollment-repository.port";
import { toDealDto } from "../../mappers/deal-dto.mapper";

@RequireTenant()
@Injectable()
export class MarkDealLostUseCase extends BaseUseCase<MarkDealLostInput, MarkDealLostOutput> {
  constructor(
    private readonly dealRepo: Pick<DealRepoPort, "findById" | "update">,
    private readonly enrollmentRepo: Pick<EnrollmentRepoPort, "cancelPendingByDealContext">,
    private readonly clock: ClockPort,
    logger: LoggerPort,
    private readonly policies: readonly DealLossRegistration[] = []
  ) {
    super({ logger });
  }

  protected validate(input: MarkDealLostInput): MarkDealLostInput {
    if (!input.dealId) {
      throw new ValidationError("dealId is required");
    }
    return input;
  }

  protected async handle(
    input: MarkDealLostInput,
    ctx: UseCaseContext
  ): Promise<Result<MarkDealLostOutput, UseCaseError>> {
    const deal = await this.dealRepo.findById(ctx.tenantId, input.dealId);
    if (!deal) {
      return err(new NotFoundError(`Deal ${input.dealId} not found`));
    }

    const reason = input.reason ?? null;
    const rejection = dealLossRejection(this.policies, deal.tenantId, { reason });
    if (rejection) {
      return err(new ValidationError(rejection, undefined, DEAL_LOSS_POLICY_REJECTED));
    }

    const now = this.clock.now();
    deal.markLost(now, reason, now);

    await this.dealRepo.update(ctx.tenantId, deal);
    await this.enrollmentRepo.cancelPendingByDealContext(ctx.tenantId, deal.id);

    return ok({ deal: toDealDto(deal) });
  }
}
