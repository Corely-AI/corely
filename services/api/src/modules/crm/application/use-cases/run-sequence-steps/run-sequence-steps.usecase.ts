import { Injectable, Logger, Inject } from "@nestjs/common";
import {
  BaseUseCase,
  ok,
  Result,
  UseCaseContext,
  UseCaseError,
  RequireTenant,
  AUDIT_PORT,
  OUTBOX_PORT,
  type AuditPort,
  type OutboxPort,
} from "@corely/kernel";
import {
  ENROLLMENT_REPO_PORT,
  type EnrollmentRepoPort,
} from "../../ports/enrollment-repository.port";
import { ACTIVITY_REPO_PORT, type ActivityRepoPort } from "../../ports/activity-repository.port";
import { ActivityEntity } from "../../../domain/activity.entity";
import { CLOCK_PORT_TOKEN, type ClockPort } from "../../../../../shared/ports/clock.port";
import {
  ID_GENERATOR_TOKEN,
  type IdGeneratorPort,
} from "../../../../../shared/ports/id-generator.port";

@Injectable()
@RequireTenant()
export class RunSequenceStepsUseCase extends BaseUseCase<{ limit: number }, { processed: number }> {
  private readonly localLogger = new Logger(RunSequenceStepsUseCase.name);

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
    input: { limit: number },
    ctx: UseCaseContext
  ): Promise<Result<{ processed: number }, UseCaseError>> {
    const enrollments = await this.enrollmentRepo.findDueEnrollments(input.limit);
    let processed = 0;

    for (const enrollment of enrollments) {
      try {
        // Find current step
        const currentStep = enrollment.sequence.steps.find(
          (s) => s.stepOrder === enrollment.currentStepOrder
        );

        if (!currentStep) {
          // Step not found (maybe sequence changed), complete enrollment?
          await this.enrollmentRepo.updateStatus(
            enrollment.id,
            "COMPLETED",
            null,
            enrollment.currentStepOrder
          );
          continue;
        }

        // Execute step
        const now = this.clock.now();
        const activityId = this.idGenerator.newId();
        const activityBase = {
          id: activityId,
          tenantId: enrollment.tenantId,
          subject: currentStep.templateSubject || "Sequence Step",
          body: currentStep.templateBody,
          partyId: enrollment.partyId || null,
          dealId: null, // Could link to a deal if enrollment has one? Enrollment model currently has lead/party.
          createdAt: now,
          createdByUserId: null, // System
        };

        if (currentStep.type === "EMAIL_AUTO") {
          // TODO: Actually send email
          // For now, log as completed email activity
          const activity = ActivityEntity.create({
            ...activityBase,
            // actually EMAIL isn't in ActivityType enum yet? It is "EMAIL_DRAFT".
            // Let's use "TASK" and say "Auto Email Sent"
            type: "TASK",
            subject: `[Auto Email] ${activityBase.subject}`,
          });
          // Mark completed immediately
          activity.complete(now, now);
          await this.activityRepo.create(enrollment.tenantId, activity);
        } else if (currentStep.type === "EMAIL_MANUAL") {
          const activity = ActivityEntity.create({
            ...activityBase,
            type: "EMAIL_DRAFT",
          });
          await this.activityRepo.create(enrollment.tenantId, activity);
        } else if (currentStep.type === "CALL") {
          const activity = ActivityEntity.create({
            ...activityBase,
            type: "TASK", // Reminder to call
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

        // Advance to next step
        const nextStep = enrollment.sequence.steps.find(
          (s) => s.stepOrder === enrollment.currentStepOrder + 1
        );
        if (nextStep) {
          const nextRun = new Date(now);
          nextRun.setDate(nextRun.getDate() + nextStep.dayDelay);
          await this.enrollmentRepo.updateStatus(
            enrollment.id,
            "ACTIVE",
            nextRun,
            nextStep.stepOrder
          );
        } else {
          // No more steps
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
          metadata: { stepOrder: currentStep.stepOrder, stepType: currentStep.type },
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

        processed++;
      } catch (err) {
        this.localLogger.error(`Failed to process enrollment ${enrollment.id}`, err);
      }
    }

    return ok({ processed });
  }
}
