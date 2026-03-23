import {
  BaseUseCase,
  NotFoundError,
  ValidationError,
  type AuditPort,
  type ClockPort,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  err,
  ok,
} from "@corely/kernel";
import {
  COACHING_EVENTS,
  type ArchiveCoachingOfferInput,
  type ArchiveCoachingOfferOutput,
} from "@corely/contracts";
import { toCoachingOfferDto } from "../mappers/coaching-dto.mapper";
import { type CoachingEngagementRepositoryPort } from "../ports/coaching-engagement-repository.port";

export class ArchiveCoachingOfferUseCase extends BaseUseCase<
  ArchiveCoachingOfferInput,
  ArchiveCoachingOfferOutput
> {
  constructor(
    private readonly deps: {
      logger: LoggerPort;
      repo: CoachingEngagementRepositoryPort;
      clock: ClockPort;
      audit: AuditPort;
    }
  ) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ArchiveCoachingOfferInput,
    ctx: UseCaseContext
  ): Promise<Result<ArchiveCoachingOfferOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.workspaceId || !ctx.userId) {
      return err(new ValidationError("tenantId, workspaceId, and userId are required"));
    }

    const offer = await this.deps.repo.findOfferById(ctx.tenantId, ctx.workspaceId, input.offerId);
    if (!offer) {
      return err(new NotFoundError("Coaching offer not found"));
    }

    if (!offer.archivedAt) {
      offer.archivedAt = this.deps.clock.now();
      offer.updatedAt = offer.archivedAt;
    }

    const archived = await this.deps.repo.updateOffer(offer);
    await this.deps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "coaching.offer.archive",
      entityType: "CoachingOffer",
      entityId: archived.id,
      metadata: {
        eventType: COACHING_EVENTS.OFFER_ARCHIVED,
      },
    });

    return ok({ offer: toCoachingOfferDto(archived) });
  }
}
