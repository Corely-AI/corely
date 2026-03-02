import { Inject, Injectable } from "@nestjs/common";
import {
  AUDIT_PORT,
  BaseUseCase,
  ok,
  OUTBOX_PORT,
  RequireTenant,
  Result,
  type AuditPort,
  type OutboxPort,
  type UseCaseContext,
  type UseCaseError,
} from "@corely/kernel";
import {
  ACTIVITY_REPO_PORT,
  type ActivityRepoPort,
} from "../../ports/activity-repository.port";
import {
  ENROLLMENT_REPO_PORT,
  type EnrollmentRepoPort,
} from "../../ports/enrollment-repository.port";
import { ActivityEntity } from "../../../domain/activity.entity";
import { CLOCK_PORT_TOKEN, type ClockPort } from "../../../../../shared/ports/clock.port";
import {
  ID_GENERATOR_TOKEN,
  type IdGeneratorPort,
} from "../../../../../shared/ports/id-generator.port";
import { scheduleCrmSequenceStep } from "@/shared/infrastructure/worker/schedule-crm-sequence-step";

export type ExecuteSequenceStepInput = {
  enrollmentId: string;
  stepId: string;
  expectedRunAt?: string;
};

export type ExecuteSequenceStepOutput = {
  status: "executed" | "noop";
};

@Injectable()
@RequireTenant()
export class ExecuteSequenceStepUseCase extends BaseUseCase<
  ExecuteSequenceStepInput,
  ExecuteSequenceStepOutput
> {
  constructor(
    @Inject(ENROLLMENT_REPO_PORT) private readonly enrollmentRepo: EnrollmentRepoPort,
    @Inject(ACTIVITY_REPO_PORT) private readonly activityRepo: ActivityRepoPort,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort,
    @Inject(ID_GENERATOR_TOKEN) private readonly idGenerator: IdGeneratorPort
  ) {
    super({});
  }

  protected async handle(
    input: ExecuteSequenceStepInput,
    ctx: UseCaseContext
  ): Promise<Result<ExecuteSequenceStepOutput, UseCaseError>> {
    const enrollment = await this.enrollmentRepo.findById(input.enrollmentId);
    if (!enrollment || enrollment.tenantId !== ctx.tenantId || enrollment.status !== "ACTIVE") {
      return ok({ status: "noop" });
    }

    const currentStep = enrollment.sequence.steps.find(
      (step) => step.stepOrder === enrollment.currentStepOrder
    );
    if (!currentStep) {
      await this.enrollmentRepo.updateStatus(
        enrollment.id,
        "COMPLETED",
        null,
        enrollment.currentStepOrder
      );
      return ok({ status: "noop" });
    }

    if (currentStep.id !== input.stepId) {
      return ok({ status: "noop" });
    }

    if (!enrollment.nextExecutionAt) {
      return ok({ status: "noop" });
    }

    const now = this.clock.now();
    if (enrollment.nextExecutionAt.getTime() > now.getTime()) {
      return ok({ status: "noop" });
    }

    if (input.expectedRunAt) {
      const expectedRunAt = new Date(input.expectedRunAt);
      if (
        Number.isNaN(expectedRunAt.getTime()) ||
        expectedRunAt.getTime() !== enrollment.nextExecutionAt.getTime()
      ) {
        return ok({ status: "noop" });
      }
    }

    const claimed = await this.enrollmentRepo.tryClaimForStepExecution({
      id: enrollment.id,
      currentStepOrder: enrollment.currentStepOrder,
      expectedUpdatedAt: enrollment.updatedAt,
    });
    if (!claimed) {
      return ok({ status: "noop" });
    }

    const activityId = this.idGenerator.newId();
    const activityBase = {
      id: activityId,
      tenantId: enrollment.tenantId,
      subject: currentStep.templateSubject || "Sequence Step",
      body: currentStep.templateBody,
      partyId: enrollment.partyId || null,
      dealId: null,
      createdAt: now,
      createdByUserId: null,
    };

    if (currentStep.type === "EMAIL_AUTO") {
      const activity = ActivityEntity.create({
        ...activityBase,
        type: "COMMUNICATION",
        channelKey: "email",
        direction: "OUTBOUND",
        communicationStatus: "SENT",
        subject: `[Auto Email] ${activityBase.subject}`,
      });
      activity.complete(now, now);
      await this.activityRepo.create(enrollment.tenantId, activity);
    } else if (currentStep.type === "EMAIL_MANUAL") {
      const activity = ActivityEntity.create({
        ...activityBase,
        type: "COMMUNICATION",
        channelKey: "email",
        direction: "OUTBOUND",
        communicationStatus: "DRAFT",
      });
      await this.activityRepo.create(enrollment.tenantId, activity);
    } else if (currentStep.type === "CALL") {
      const activity = ActivityEntity.create({
        ...activityBase,
        type: "TASK",
        subject: `Call: ${activityBase.subject}`,
        dueAt: now,
      });
      await this.activityRepo.create(enrollment.tenantId, activity);
    } else if (currentStep.type === "TASK") {
      const activity = ActivityEntity.create({
        ...activityBase,
        type: "TASK",
        dueAt: now,
      });
      await this.activityRepo.create(enrollment.tenantId, activity);
    }

    const nextStep = enrollment.sequence.steps.find(
      (step) => step.stepOrder === enrollment.currentStepOrder + 1
    );

    if (nextStep) {
      const nextRun = new Date(now);
      nextRun.setDate(nextRun.getDate() + nextStep.dayDelay);
      await this.enrollmentRepo.updateStatus(enrollment.id, "ACTIVE", nextRun, nextStep.stepOrder);
      await scheduleCrmSequenceStep({
        tenantId: enrollment.tenantId,
        enrollmentId: enrollment.id,
        stepId: nextStep.id,
        runAt: nextRun,
        expectedRunAt: nextRun,
        traceId: ctx.correlationId,
      });
    } else {
      await this.enrollmentRepo.updateStatus(
        enrollment.id,
        "COMPLETED",
        null,
        enrollment.currentStepOrder
      );
    }

    await this.audit.log({
      tenantId: enrollment.tenantId,
      userId: "system",
      action: "crm.sequence.step.run",
      entityType: "sequenceEnrollment",
      entityId: enrollment.id,
      metadata: {
        stepOrder: currentStep.stepOrder,
        stepId: currentStep.id,
        stepType: currentStep.type,
      },
    });

    await this.outbox.enqueue({
      eventType: "crm.sequence.step.executed",
      tenantId: enrollment.tenantId,
      correlationId: ctx.correlationId,
      payload: {
        enrollmentId: enrollment.id,
        stepOrder: currentStep.stepOrder,
        stepType: currentStep.type,
      },
    });

    return ok({ status: "executed" });
  }
}
