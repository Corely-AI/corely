import { describe, expect, it, vi } from "vitest";
import { isOk, type UseCaseContext } from "@corely/kernel";
import { ExecuteSequenceStepUseCase } from "./execute-sequence-step.usecase";
import type {
  EnrollmentRepoPort,
  EnrollmentWithRelations,
} from "../../ports/enrollment-repository.port";
import type { ActivityRepoPort } from "../../ports/activity-repository.port";
import type { AuditPort, OutboxPort } from "@corely/kernel";
import type { ClockPort } from "../../../../../shared/ports/clock.port";
import type { IdGeneratorPort } from "../../../../../shared/ports/id-generator.port";
import { scheduleCrmSequenceStep } from "@/shared/infrastructure/worker/schedule-crm-sequence-step";

vi.mock("@/shared/infrastructure/worker/schedule-crm-sequence-step", () => ({
  scheduleCrmSequenceStep: vi.fn().mockResolvedValue(undefined),
}));

class InMemoryEnrollmentRepo implements EnrollmentRepoPort {
  constructor(private readonly enrollment: EnrollmentWithRelations) {}

  async create(): Promise<void> {}

  async findDueEnrollments(): Promise<EnrollmentWithRelations[]> {
    return [];
  }

  async findById(id: string): Promise<EnrollmentWithRelations | null> {
    if (id !== this.enrollment.id) {
      return null;
    }
    return this.enrollment;
  }

  async tryClaimForStepExecution(input: {
    id: string;
    currentStepOrder: number;
    expectedUpdatedAt: Date;
  }): Promise<boolean> {
    if (input.id !== this.enrollment.id) {
      return false;
    }
    if (this.enrollment.status !== "ACTIVE") {
      return false;
    }
    if (this.enrollment.currentStepOrder !== input.currentStepOrder) {
      return false;
    }
    if (this.enrollment.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) {
      return false;
    }

    this.enrollment.updatedAt = new Date(this.enrollment.updatedAt.getTime() + 1);
    return true;
  }

  async updateStatus(
    id: string,
    status: "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELED",
    nextExecutionAt: Date | null,
    currentStepOrder: number
  ): Promise<void> {
    if (id !== this.enrollment.id) {
      return;
    }
    this.enrollment.status = status;
    this.enrollment.nextExecutionAt = nextExecutionAt;
    this.enrollment.currentStepOrder = currentStepOrder;
    this.enrollment.updatedAt = new Date(this.enrollment.updatedAt.getTime() + 1);
  }
}

const ctx: UseCaseContext = {
  tenantId: "tenant-1",
  workspaceId: "tenant-1",
  correlationId: "corr-1",
};

describe("ExecuteSequenceStepUseCase", () => {
  it("is idempotent for repeated execute-step calls", async () => {
    const now = new Date("2026-03-02T10:00:00.000Z");
    const enrollment: EnrollmentWithRelations = {
      id: "enr-1",
      tenantId: "tenant-1",
      sequenceId: "seq-1",
      leadId: null,
      partyId: "party-1",
      currentStepOrder: 1,
      status: "ACTIVE",
      nextExecutionAt: new Date("2026-03-02T09:59:00.000Z"),
      updatedAt: new Date("2026-03-02T09:58:00.000Z"),
      sequence: {
        steps: [
          {
            id: "step-1",
            stepOrder: 1,
            type: "TASK",
            dayDelay: 0,
            templateSubject: "Step 1",
            templateBody: "Do step 1",
          },
          {
            id: "step-2",
            stepOrder: 2,
            type: "TASK",
            dayDelay: 2,
            templateSubject: "Step 2",
            templateBody: "Do step 2",
          },
        ],
      },
    };

    const enrollmentRepo = new InMemoryEnrollmentRepo(enrollment);
    const activityRepo: ActivityRepoPort = {
      findById: vi.fn(),
      list: vi.fn(),
      create: vi.fn().mockResolvedValue(undefined),
      update: vi.fn(),
      getTimeline: vi.fn(),
      findCommunicationByExternalMessageId: vi.fn(),
      upsertWebhookEvent: vi.fn(),
    };
    const audit: AuditPort = {
      log: vi.fn().mockResolvedValue(undefined),
    };
    const outbox: OutboxPort = {
      enqueue: vi.fn().mockResolvedValue(undefined),
    };
    const clock: ClockPort = {
      now: vi.fn().mockReturnValue(now),
    };
    const idGenerator: IdGeneratorPort = {
      newId: vi.fn().mockReturnValue("act-1"),
    };

    const useCase = new ExecuteSequenceStepUseCase(
      enrollmentRepo,
      activityRepo,
      audit,
      outbox,
      clock,
      idGenerator
    );

    const first = await useCase.execute({ enrollmentId: "enr-1", stepId: "step-1" }, ctx);
    const second = await useCase.execute({ enrollmentId: "enr-1", stepId: "step-1" }, ctx);

    expect(isOk(first)).toBe(true);
    expect(isOk(second)).toBe(true);
    if (!isOk(first) || !isOk(second)) {
      throw new Error("Expected successful execution results");
    }

    expect(first.value.status).toBe("executed");
    expect(second.value.status).toBe("noop");
    expect(vi.mocked(activityRepo.create)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(outbox.enqueue)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(audit.log)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(scheduleCrmSequenceStep)).toHaveBeenCalledTimes(1);
  });
});
