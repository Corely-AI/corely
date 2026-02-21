import { describe, expect, it } from "vitest";
import type { OutboxMessage, OutboxPort, UseCaseContext } from "@corely/kernel";
import { UpsertMilestoneCompletionUseCase } from "../application/use-cases/upsert-milestone-completion.usecase";
import type { ClassesRepositoryPort } from "../application/ports/classes-repository.port";
import type { AuditPort } from "../application/ports/audit.port";
import type { IdGeneratorPort } from "../application/ports/id-generator.port";
import type { ClockPort } from "../application/ports/clock.port";
import type {
  ClassEnrollmentEntity,
  ClassMilestoneCompletionEntity,
  ClassMilestoneEntity,
} from "../domain/entities/classes.entities";

const ctx: UseCaseContext = {
  tenantId: "tenant-1",
  workspaceId: "workspace-1",
  userId: "user-1",
  requestId: "req-1",
  correlationId: "corr-1",
  roles: [],
  metadata: { permissions: ["classes.cohort.outcomes.manage"] },
};

class FakeRepo {
  public milestone: ClassMilestoneEntity = {
    id: "ms-1",
    tenantId: "tenant-1",
    workspaceId: "workspace-1",
    classGroupId: "group-1",
    title: "Pronunciation checkpoint",
    type: "CHECKPOINT",
    required: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
  public enrollment: ClassEnrollmentEntity = {
    id: "enr-1",
    tenantId: "tenant-1",
    workspaceId: "workspace-1",
    classGroupId: "group-1",
    studentClientId: "student-1",
    payerClientId: "payer-1",
    status: "ENROLLED",
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
  private readonly completions = new Map<string, ClassMilestoneCompletionEntity>();

  async findMilestoneById() {
    return this.milestone;
  }

  async findEnrollmentById() {
    return this.enrollment;
  }

  async upsertMilestoneCompletion(
    _tenantId: string,
    _workspaceId: string,
    milestoneId: string,
    enrollmentId: string,
    data: ClassMilestoneCompletionEntity
  ) {
    const key = `${milestoneId}:${enrollmentId}`;
    const existing = this.completions.get(key);
    if (existing) {
      const next: ClassMilestoneCompletionEntity = {
        ...existing,
        ...data,
        id: existing.id,
        createdAt: existing.createdAt,
      };
      this.completions.set(key, next);
      return next;
    }
    this.completions.set(key, data);
    return data;
  }
}

class FakeAudit implements AuditPort {
  async log() {}
}

class FakeOutbox implements OutboxPort {
  public events: OutboxMessage[] = [];
  async enqueue(message: OutboxMessage) {
    this.events.push(message);
  }
  async enqueueMany(messages: OutboxMessage[]) {
    this.events.push(...messages);
  }
}

class FakeIdGenerator implements IdGeneratorPort {
  private sequence = 0;
  newId() {
    this.sequence += 1;
    return `completion-${this.sequence}`;
  }
}

class FakeClock implements ClockPort {
  now() {
    return new Date("2026-02-21T21:30:00.000Z");
  }
}

describe("UpsertMilestoneCompletionUseCase", () => {
  it("upserts by (milestoneId, enrollmentId) without creating duplicates", async () => {
    const repo = new FakeRepo();
    const outbox = new FakeOutbox();
    const useCase = new UpsertMilestoneCompletionUseCase(
      repo as unknown as ClassesRepositoryPort,
      new FakeAudit(),
      outbox,
      new FakeIdGenerator(),
      new FakeClock()
    );

    const first = await useCase.execute(
      {
        milestoneId: "ms-1",
        enrollmentId: "enr-1",
        status: "SUBMITTED",
      },
      ctx
    );
    const second = await useCase.execute(
      {
        milestoneId: "ms-1",
        enrollmentId: "enr-1",
        status: "PASSED",
      },
      ctx
    );

    expect(first.id).toBe(second.id);
    expect(second.status).toBe("PASSED");
    expect(outbox.events.length).toBe(2);
  });
});
