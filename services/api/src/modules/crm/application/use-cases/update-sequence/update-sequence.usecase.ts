import { Inject, Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  UseCaseContext,
  Result,
  ok,
  err,
  UseCaseError,
  RequireTenant,
  NotFoundError,
  AUDIT_PORT,
  OUTBOX_PORT,
  IDEMPOTENCY_PORT,
  type AuditPort,
  type OutboxPort,
  type IdempotencyPort,
} from "@corely/kernel";
import { UpdateSequenceInput, SequenceDto } from "@corely/contracts";
import { SEQUENCE_REPO_PORT, type SequenceRepoPort } from "../../ports/sequence-repository.port";
import { SequenceAggregate } from "../../../domain/sequence.aggregate";
import { SequenceStepType } from "@prisma/client";
import { CLOCK_PORT_TOKEN, type ClockPort } from "../../../../../shared/ports/clock.port";
import {
  ID_GENERATOR_TOKEN,
  type IdGeneratorPort,
} from "../../../../../shared/ports/id-generator.port";

type UpdateSequenceUseCaseInput = UpdateSequenceInput & {
  id: string;
};

@Injectable()
@RequireTenant()
export class UpdateSequenceUseCase extends BaseUseCase<UpdateSequenceUseCaseInput, SequenceDto> {
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
    input: UpdateSequenceUseCaseInput,
    ctx: UseCaseContext
  ): Promise<Result<SequenceDto, UseCaseError>> {
    const existing = await this.sequenceRepo.findById(ctx.tenantId, input.id);
    if (!existing) {
      return err(new NotFoundError("Sequence not found"));
    }

    const now = this.clock.now();
    const steps = input.steps.map((step) => ({
      id: this.idGenerator.newId(),
      tenantId: ctx.tenantId,
      sequenceId: existing.id,
      stepOrder: step.stepOrder,
      type: step.type as SequenceStepType,
      dayDelay: step.dayDelay,
      templateSubject: step.templateSubject ?? null,
      templateBody: step.templateBody ?? null,
      createdAt: now,
      updatedAt: now,
    }));

    const aggregate = new SequenceAggregate(
      existing.id,
      ctx.tenantId,
      steps,
      input.name,
      input.description || null,
      existing.ownerUserId ?? null,
      existing.createdAt ?? now,
      now
    );

    await this.sequenceRepo.update(ctx.tenantId, aggregate);
    await this.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? "system",
      action: "crm.sequence.update",
      entityType: "sequence",
      entityId: aggregate.id,
      metadata: { stepCount: aggregate.steps.length },
    });
    await this.outbox.enqueue({
      eventType: "crm.sequence.updated",
      tenantId: ctx.tenantId,
      correlationId: ctx.correlationId,
      payload: { sequenceId: aggregate.id },
    });

    return ok(this.toDto(aggregate));
  }

  private toDto(sequence: SequenceAggregate): SequenceDto {
    return {
      id: sequence.id,
      tenantId: sequence.tenantId,
      name: sequence.name,
      description: sequence.description ?? null,
      ownerUserId: sequence.ownerUserId ?? null,
      createdAt: (sequence.createdAt ?? new Date()).toISOString(),
      updatedAt: (sequence.updatedAt ?? sequence.createdAt ?? new Date()).toISOString(),
      steps: sequence.steps.map((step) => ({
        id: step.id,
        tenantId: step.tenantId,
        sequenceId: step.sequenceId,
        stepOrder: step.stepOrder,
        type: step.type,
        dayDelay: step.dayDelay,
        templateSubject: step.templateSubject,
        templateBody: step.templateBody,
      })),
    };
  }
}
