import { Logger } from "@nestjs/common";
import { scheduleWorkerJob } from "./schedule-worker-job";

const logger = new Logger("CrmSequenceStepScheduler");

export type ScheduleCrmSequenceStepInput = {
  tenantId: string;
  enrollmentId: string;
  stepId: string;
  runAt: Date;
  expectedRunAt?: Date;
  traceId?: string;
};

export async function scheduleCrmSequenceStep(input: ScheduleCrmSequenceStepInput): Promise<void> {
  const idempotencyKey = [
    "crm.sequence.executeStep",
    input.enrollmentId,
    input.stepId,
    input.runAt.toISOString(),
  ].join(":");

  const result = await scheduleWorkerJob({
    jobName: "crm.sequence.executeStep",
    payload: {
      tenantId: input.tenantId,
      enrollmentId: input.enrollmentId,
      stepId: input.stepId,
      expectedRunAt: (input.expectedRunAt ?? input.runAt).toISOString(),
    },
    runAt: input.runAt,
    idempotencyKey,
    traceId: input.traceId,
  });

  if (!result.scheduled) {
    logger.warn(
      `Failed to schedule crm.sequence.executeStep for enrollment=${input.enrollmentId} step=${input.stepId}`
    );
  }
}
