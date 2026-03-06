import { Inject, Injectable, Logger } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { PrismaService } from "@corely/data";
import {
  JOB_SCHEDULER_PORT,
  type JobSchedulerPort,
} from "../../shared/scheduling/job-scheduler.port";

export type ExecuteCrmSequenceStepPayload = {
  enrollmentId: string;
  stepId: string;
  expectedRunAt?: string;
  tenantId?: string;
  checkpoint?: boolean;
  originalRunAt?: string;
};

@Injectable()
export class CrmSequenceExecutorService {
  private readonly logger = new Logger(CrmSequenceExecutorService.name);

  constructor(
    private readonly env: EnvService,
    private readonly prisma: PrismaService,
    @Inject(JOB_SCHEDULER_PORT) private readonly jobScheduler: JobSchedulerPort
  ) {}

  async executeStep(payload: ExecuteCrmSequenceStepPayload): Promise<void> {
    if (payload.checkpoint) {
      await this.handleCheckpoint(payload);
      return;
    }

    const tenantId = payload.tenantId ?? (await this.resolveTenantId(payload.enrollmentId));
    if (!tenantId) {
      this.logger.warn(
        `Enrollment ${payload.enrollmentId} not found when executing scheduled sequence step`
      );
      return;
    }

    const baseUrl = this.env.API_BASE_URL;
    if (!baseUrl) {
      throw new Error("API_BASE_URL is required for CRM sequence step execution");
    }

    const url = `${baseUrl.replace(/\/$/, "")}/internal/crm/sequences/execute-step`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-tenant-id": tenantId,
        "x-workspace-id": tenantId,
        ...(this.env.WORKER_API_SERVICE_TOKEN
          ? { "x-service-token": this.env.WORKER_API_SERVICE_TOKEN }
          : {}),
      },
      body: JSON.stringify({
        enrollmentId: payload.enrollmentId,
        stepId: payload.stepId,
        ...(payload.expectedRunAt ? { expectedRunAt: payload.expectedRunAt } : {}),
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Failed CRM sequence execute-step call: ${response.status} ${response.statusText} ${body}`
      );
    }
  }

  private async handleCheckpoint(payload: ExecuteCrmSequenceStepPayload): Promise<void> {
    if (!payload.originalRunAt) {
      return;
    }

    const originalRunAt = new Date(payload.originalRunAt);
    if (Number.isNaN(originalRunAt.getTime())) {
      this.logger.warn(
        `Ignoring sequence checkpoint with invalid originalRunAt=${payload.originalRunAt}`
      );
      return;
    }

    if (originalRunAt.getTime() <= Date.now()) {
      return;
    }

    await this.jobScheduler.schedule(
      "crm.sequence.executeStep",
      {
        enrollmentId: payload.enrollmentId,
        stepId: payload.stepId,
        ...(payload.expectedRunAt ? { expectedRunAt: payload.expectedRunAt } : {}),
        ...(payload.tenantId ? { tenantId: payload.tenantId } : {}),
      },
      {
        runAt: originalRunAt,
        idempotencyKey: `crm-seq:${payload.enrollmentId}:${payload.stepId}:${originalRunAt.toISOString()}`,
      }
    );
  }

  private async resolveTenantId(enrollmentId: string): Promise<string | undefined> {
    const enrollment = await this.prisma.sequenceEnrollment.findUnique({
      where: { id: enrollmentId },
      select: { tenantId: true },
    });
    return enrollment?.tenantId;
  }
}
