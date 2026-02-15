import { Injectable, Logger } from "@nestjs/common";
import { BaseUseCase, ok, Result, UseCaseContext, ClockPort, IdGeneratorPort, UseCaseError } from "@corely/kernel";
import { PrismaEnrollmentRepoAdapter, EnrollmentWithRelations } from "../../../infrastructure/prisma/prisma-enrollment-repo.adapter";
import { PrismaActivityRepoAdapter } from "../../../infrastructure/prisma/prisma-activity-repo.adapter";
import { ActivityEntity } from "../../../domain/activity.entity";

@Injectable()
export class RunSequenceStepsUseCase extends BaseUseCase<{ limit: number }, { processed: number }> {
    private readonly localLogger = new Logger(RunSequenceStepsUseCase.name);

    constructor(
        private readonly enrollmentRepo: PrismaEnrollmentRepoAdapter,
        private readonly activityRepo: PrismaActivityRepoAdapter,
        private readonly clock: ClockPort,
        private readonly idGenerator: IdGeneratorPort,
    ) {
        super();
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
                const currentStep = enrollment.sequence.steps.find((s) => s.stepOrder === enrollment.currentStepOrder);

                if (!currentStep) {
                    // Step not found (maybe sequence changed), complete enrollment?
                    await this.enrollmentRepo.updateStatus(enrollment.id, "COMPLETED", null, enrollment.currentStepOrder);
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
                const nextStep = enrollment.sequence.steps.find((s) => s.stepOrder === enrollment.currentStepOrder + 1);
                if (nextStep) {
                    const nextRun = new Date(now);
                    nextRun.setDate(nextRun.getDate() + nextStep.dayDelay);
                    await this.enrollmentRepo.updateStatus(enrollment.id, "ACTIVE", nextRun, nextStep.stepOrder);
                } else {
                    // No more steps
                    await this.enrollmentRepo.updateStatus(enrollment.id, "COMPLETED", null, enrollment.currentStepOrder);
                }

                processed++;
            } catch (err) {
                this.localLogger.error(`Failed to process enrollment ${enrollment.id}`, err);
            }
        }

        return ok({ processed });
    }
}
