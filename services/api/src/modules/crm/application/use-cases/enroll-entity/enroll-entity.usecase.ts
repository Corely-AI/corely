import { Injectable, Inject } from "@nestjs/common";
import {
  BaseUseCase,
  ok,
  Result,
  UseCaseContext,
  RequireTenant,
  UseCaseError,
  NotFoundError,
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

    // Calculate next execution time
    const nextExecutionAt = new Date(this.clock.now());
    nextExecutionAt.setDate(nextExecutionAt.getDate() + dayDelay);

    const enrollmentId = this.idGenerator.newId();

    await this.enrollmentRepo.create({
      id: enrollmentId,
      tenantId: ctx.tenantId,
      sequenceId: input.sequenceId,
      leadId: input.entityType === "lead" ? input.entityId : undefined,
      partyId: input.entityType === "party" ? input.entityId : undefined,
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
      },
    });

    return ok({ enrollmentId });
  }
}
