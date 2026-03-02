export type JobName = "worker.tick" | "crm.sequence.executeStep";

export interface JobScheduleOptions {
  runAt?: Date;
  idempotencyKey?: string;
  traceId?: string;
}

export interface ScheduledJobRef {
  externalRef?: string;
}

export interface JobSchedulerPort {
  schedule(
    job: JobName,
    payload: unknown,
    opts?: JobScheduleOptions
  ): Promise<ScheduledJobRef>;
  cancel?(externalRef: string): Promise<void>;
}

export const JOB_SCHEDULER_PORT = Symbol("JOB_SCHEDULER_PORT");
