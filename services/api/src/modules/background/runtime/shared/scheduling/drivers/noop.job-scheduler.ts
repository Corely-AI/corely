import { Injectable } from "@nestjs/common";
import type {
  JobName,
  JobScheduleOptions,
  JobSchedulerPort,
  ScheduledJobRef,
} from "../job-scheduler.port";

@Injectable()
export class NoopJobScheduler implements JobSchedulerPort {
  async schedule(
    _job: JobName,
    _payload: unknown,
    _opts?: JobScheduleOptions
  ): Promise<ScheduledJobRef> {
    return {};
  }
}
