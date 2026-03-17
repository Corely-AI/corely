import { Injectable } from "@nestjs/common";
import type {
  JobName,
  JobScheduleOptions,
  JobSchedulerPort,
  ScheduledJobRef,
} from "../job-scheduler.port";

export type InMemoryScheduledJob = {
  job: JobName;
  payload: unknown;
  opts?: JobScheduleOptions;
};

@Injectable()
export class InMemoryJobScheduler implements JobSchedulerPort {
  private readonly jobs: InMemoryScheduledJob[] = [];

  async schedule(
    job: JobName,
    payload: unknown,
    opts?: JobScheduleOptions
  ): Promise<ScheduledJobRef> {
    this.jobs.push({ job, payload, opts });
    return { externalRef: `inmemory:${this.jobs.length}` };
  }

  listJobs(): readonly InMemoryScheduledJob[] {
    return this.jobs;
  }

  clear(): void {
    this.jobs.length = 0;
  }
}
