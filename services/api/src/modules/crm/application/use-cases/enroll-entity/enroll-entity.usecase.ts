import { Injectable, Inject } from "@nestjs/common";
import {
  BaseUseCase,
  ok,
  Result,
  UseCaseContext,
  RequireTenant,
  UseCaseError,
  NotFoundError,
  ValidationError,
  err,
  AUDIT_PORT,
  OUTBOX_PORT,
  IDEMPOTENCY_PORT,
  type AuditPort,
  type OutboxPort,
  type IdempotencyPort,
} from "@corely/kernel";
import { EnrollEntityInput } from "@corely/contracts";
import {
  ENROLLMENT_REPO_PORT,
  type EnrollmentRepoPort,
} from "../../ports/enrollment-repository.port";
import { SEQUENCE_REPO_PORT, type SequenceRepoPort } from "../../ports/sequence-repository.port";
import { LEAD_REPO_PORT, type LeadRepoPort } from "../../ports/lead-repository.port";
import { DEAL_REPO_PORT, type DealRepoPort } from "../../ports/deal-repository.port";
import { CLOCK_PORT_TOKEN, type ClockPort } from "../../../../../shared/ports/clock.port";
import {
  ID_GENERATOR_TOKEN,
  type IdGeneratorPort,
} from "../../../../../shared/ports/id-generator.port";
import { NestLoggerAdapter } from "../../../../../shared/adapters/logger/nest-logger.adapter";

@Injectable()
@RequireTenant()
export class EnrollEntityUseCase extends BaseUseCase<EnrollEntityInput, { enrollmentId: string }> {
  constructor(
    @Inject(ENROLLMENT_REPO_PORT) private readonly enrollmentRepo: EnrollmentRepoPort,
    @Inject(SEQUENCE_REPO_PORT) private readonly sequenceRepo: SequenceRepoPort,
    @Inject(LEAD_REPO_PORT) private readonly leadRepo: LeadRepoPort,
    @Inject(DEAL_REPO_PORT) private readonly dealRepo: DealRepoPort,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort,
    @Inject(IDEMPOTENCY_PORT) idempotency: IdempotencyPort,
    @Inject(ID_GENERATOR_TOKEN) private readonly idGenerator: IdGeneratorPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort
  ) {
    super({ logger: new NestLoggerAdapter(), idempotency });
  }

  protected async handle(
    input: EnrollEntityInput,
    ctx: UseCaseContext
  ): Promise<Result<{ enrollmentId: string }, UseCaseError>> {
    const sequence = await this.sequenceRepo.findById(ctx.tenantId, input.sequenceId);
    if (!sequence) {
      return err(new NotFoundError(`Sequence ${input.sequenceId} not found`));
    }

    const firstStep = sequence.getStepByOrder(1);
    const dayDelay = firstStep?.dayDelay ?? 0;

    let leadId: string | undefined;
    let partyId: string | undefined;
    let dealId: string | undefined;

    if (input.entityType === "lead") {
      const lead = await this.leadRepo.findById(ctx.tenantId, input.entityId);
      if (!lead) {
        return err(new NotFoundError(`Lead ${input.entityId} not found`));
      }
      leadId = lead.id;
      dealId = input.contextDealId ?? lead.convertedDealId ?? undefined;
      if (!dealId && lead.convertedPartyId) {
        partyId = lead.convertedPartyId;
      }
    } else if (input.entityType === "party") {
      partyId = input.entityId;
      dealId = input.contextDealId ?? undefined;
    } else {
      // Backward-compatible input: map deal enrollment to lead/contact target + deal context.
      dealId = input.entityId;
      const lead = await this.leadRepo.findByConvertedDealId(ctx.tenantId, dealId);
      if (lead) {
        leadId = lead.id;
      } else {
        const deal = await this.dealRepo.findById(ctx.tenantId, dealId);
        if (!deal) {
          return err(new NotFoundError(`Deal ${dealId} not found`));
        }
        partyId = deal.partyId;
      }
    }

    const hasAutoEmailStep = sequence.steps.some((step) => step.type === "EMAIL_AUTO");
    if (hasAutoEmailStep && !dealId) {
      return err(new ValidationError("contextDealId is required for automated email sequences"));
    }

    if (!leadId && !partyId) {
      return err(
        new ValidationError("Enrollment requires a lead or party target after context resolution")
      );
    }

    // Calculate next execution time
    const nextExecutionAt = new Date(this.clock.now());
    nextExecutionAt.setDate(nextExecutionAt.getDate() + dayDelay);

    if (leadId && dealId) {
      const existing = await this.enrollmentRepo.findBySequenceLeadDealContext(
        ctx.tenantId,
        input.sequenceId,
        leadId,
        dealId
      );
      if (existing) {
        return ok({ enrollmentId: existing.id });
      }
    }

    const enrollmentId = this.idGenerator.newId();

    await this.enrollmentRepo.create({
      id: enrollmentId,
      tenantId: ctx.tenantId,
      sequenceId: input.sequenceId,
      leadId,
      partyId,
      dealId,
      status: "ACTIVE",
      nextExecutionAt,
    });
    await this.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? "system",
      action: "crm.sequence.enroll",
      entityType: "sequenceEnrollment",
      entityId: enrollmentId,
      metadata: {
        sequenceId: input.sequenceId,
        entityType: input.entityType,
        entityId: input.entityId,
        resolvedLeadId: leadId ?? null,
        resolvedPartyId: partyId ?? null,
        contextDealId: dealId ?? null,
      },
    });
    await this.outbox.enqueue({
      eventType: "crm.sequence.enrolled",
      tenantId: ctx.tenantId,
      correlationId: ctx.correlationId,
      payload: {
        enrollmentId,
        sequenceId: input.sequenceId,
        entityType: input.entityType,
        entityId: input.entityId,
        resolvedLeadId: leadId ?? null,
        resolvedPartyId: partyId ?? null,
        contextDealId: dealId ?? null,
      },
    });

    return ok({ enrollmentId });
  }
}
