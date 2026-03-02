import { Global, Module } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { JOB_SCHEDULER_PORT } from "./job-scheduler.port";
import { CloudTasksJobScheduler } from "./drivers/cloudtasks.job-scheduler";
import { NoopJobScheduler } from "./drivers/noop.job-scheduler";

@Global()
@Module({
  providers: [
    {
      provide: JOB_SCHEDULER_PORT,
      useFactory: (env: EnvService) => {
        const driver = env.JOB_SCHEDULER_DRIVER ?? "noop";

        if (driver === "cloudtasks") {
          const projectId = env.GCP_PROJECT_ID ?? env.GOOGLE_CLOUD_PROJECT;
          if (!projectId) {
            throw new Error("GCP_PROJECT_ID is required when JOB_SCHEDULER_DRIVER=cloudtasks");
          }
          if (!env.GCP_LOCATION) {
            throw new Error("GCP_LOCATION is required when JOB_SCHEDULER_DRIVER=cloudtasks");
          }
          if (!env.CLOUD_TASKS_QUEUE_NAME) {
            throw new Error(
              "CLOUD_TASKS_QUEUE_NAME is required when JOB_SCHEDULER_DRIVER=cloudtasks"
            );
          }
          if (!env.WORKER_BASE_URL) {
            throw new Error("WORKER_BASE_URL is required when JOB_SCHEDULER_DRIVER=cloudtasks");
          }

          return new CloudTasksJobScheduler({
            projectId,
            location: env.GCP_LOCATION,
            queueName: env.CLOUD_TASKS_QUEUE_NAME,
            workerBaseUrl: env.WORKER_BASE_URL,
            serviceAccountEmail: env.CLOUD_TASKS_INVOKER_SERVICE_ACCOUNT_EMAIL,
            workerKey: process.env.INTERNAL_WORKER_KEY,
          });
        }

        return new NoopJobScheduler();
      },
      inject: [EnvService],
    },
  ],
  exports: [JOB_SCHEDULER_PORT],
})
export class JobSchedulerModule {}
