import { Injectable, Inject } from "@nestjs/common";
import {
  BaseUseCase,
  UseCaseContext,
  Result,
  ok,
  UseCaseError,
  RequireTenant,
  AUDIT_PORT,
  OUTBOX_PORT,
  IDEMPOTENCY_PORT,
  type AuditPort,
  type OutboxPort,
  type IdempotencyPort,
} from "@corely/kernel";
import { CreateSequenceInput, SequenceDto } from "@corely/contracts";
import { SEQUENCE_REPO_PORT, type SequenceRepoPort } from "../../ports/sequence-repository.port";
import { SequenceAggregate } from "../../../domain/sequence.aggregate";
import { SequenceStepType } from "@prisma/client";
import { CLOCK_PORT_TOKEN, type ClockPort } from "../../../../../shared/ports/clock.port";
import {
  ID_GENERATOR_TOKEN,
  type IdGeneratorPort,
} from "../../../../../shared/ports/id-generator.port";

@Injectable()
@RequireTenant()
export class CreateSequenceUseCase extends BaseUseCase<CreateSequenceInput, SequenceDto> {
  constructor(
    @Inject(SEQUENCE_REPO_PORT) private readonly sequenceRepo: SequenceRepoPort,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort,
    @Inject(IDEMPOTENCY_PORT) idempotency: IdempotencyPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort,
    @Inject(ID_GENERATOR_TOKEN) private readonly idGenerator: IdGeneratorPort
  ) {
    super({ idempotency });
  }

  protected async handle(
    input: CreateSequenceInput,
    ctx: UseCaseContext
  ): Promise<Result<SequenceDto, UseCaseError>> {
    const sequenceId = this.idGenerator.newId();
    const now = this.clock.now();

    const steps = input.steps.map((step) => ({
      id: this.idGenerator.newId(),
      tenantId: ctx.tenantId,
      sequenceId,
      stepOrder: step.stepOrder,
      type: step.type as SequenceStepType, // Cast assuming validation ensures compatibility
      dayDelay: step.dayDelay,
      templateSubject: step.templateSubject ?? null,
      templateBody: step.templateBody ?? null,
      createdAt: now,
      updatedAt: now,
    }));

    const aggregate = new SequenceAggregate(
      sequenceId,
      ctx.tenantId,
      steps,
      input.name,
      input.description || null,
      ctx.userId || null,
      now,
      now
      // other fields if aggregate has them? constructor signature:
      // id, tenantId, steps, name, description, ownerUserId?
    );

    // SequenceAggregate constructor:
    // public readonly id: string,
    // public readonly tenantId: string,
    // public readonly steps: SequenceStep[],
    // public readonly name: string,
    // public readonly description?: string | null,
    // public readonly ownerUserId?: string | null

    await this.sequenceRepo.create(ctx.tenantId, aggregate);
    await this.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? "system",
      action: "crm.sequence.create",
      entityType: "sequence",
      entityId: aggregate.id,
      metadata: { stepCount: aggregate.steps.length },
    });
    await this.outbox.enqueue({
      eventType: "crm.sequence.created",
      tenantId: ctx.tenantId,
      correlationId: ctx.correlationId,
      payload: { sequenceId: aggregate.id },
    });

    return ok({
      id: aggregate.id,
      tenantId: aggregate.tenantId,
      name: aggregate.name,
      description: aggregate.description,
      ownerUserId: aggregate.ownerUserId,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      steps: steps.map((s) => ({
        id: s.id,
        tenantId: s.tenantId,
        sequenceId: s.sequenceId,
        stepOrder: s.stepOrder,
        type: s.type,
        dayDelay: s.dayDelay,
        templateSubject: s.templateSubject,
        templateBody: s.templateBody,
      })),
    });
  }
}
