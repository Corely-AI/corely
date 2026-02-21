import { describe, expect, it } from "vitest";
import type { OutboxMessage, OutboxPort, UseCaseContext } from "@corely/kernel";
import { ValidationFailedError } from "@corely/domain";
import { ApproveApplicationUseCase } from "../application/use-cases/approve-application.usecase";
import type { ClassesRepositoryPort } from "../application/ports/classes-repository.port";
import type { AuditPort } from "../application/ports/audit.port";
import type { IdempotencyStoragePort } from "../application/ports/idempotency.port";
import type { ClockPort } from "../application/ports/clock.port";
import type { ClassEnrollmentEntity } from "../domain/entities/classes.entities";

const ctx: UseCaseContext = {
  tenantId: "tenant-1",
  workspaceId: "workspace-1",
  userId: "user-1",
  requestId: "req-1",
  correlationId: "corr-1",
  roles: [],
  metadata: { permissions: ["classes.enrollment.manage"] },
};

class FakeRepo {
  public enrollment: ClassEnrollmentEntity = {
    id: "enr-1",
    tenantId: "tenant-1",
    workspaceId: "workspace-1",
    classGroupId: "group-1",
    studentClientId: "student-1",
    payerClientId: "payer-1",
    status: "APPLIED",
    seatType: "LEARNER",
    source: "ADMIN",
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  async findEnrollmentById() {
    return this.enrollment;
  }

  async updateEnrollment(
    _tenantId: string,
    _workspaceId: string,
    _enrollmentId: string,
    updates: Partial<ClassEnrollmentEntity>
  ) {
    this.enrollment = { ...this.enrollment, ...updates };
    return this.enrollment;
  }
}

class FakeAudit implements AuditPort {
  async log() {}
}

class FakeOutbox implements OutboxPort {
  public events: OutboxMessage[] = [];
  async enqueue(message: OutboxMessage): Promise<void> {
    this.events.push(message);
  }
  async enqueueMany(messages: OutboxMessage[]): Promise<void> {
    this.events.push(...messages);
  }
}

class FakeIdempotency implements IdempotencyStoragePort {
  private readonly cache = new Map<string, unknown>();
  async get(actionKey: string, tenantId: string | null, key: string): Promise<any> {
    return this.cache.get(`${actionKey}:${tenantId}:${key}`) ?? null;
  }
  async store(
    actionKey: string,
    tenantId: string | null,
    key: string,
    response: unknown
  ): Promise<void> {
    this.cache.set(`${actionKey}:${tenantId}:${key}`, response);
  }
}

class FakeClock implements ClockPort {
  now(): Date {
    return new Date("2026-02-01T10:00:00.000Z");
  }
}

describe("ApproveApplicationUseCase", () => {
  it("transitions APPLIED enrollment to ENROLLED", async () => {
    const repo = new FakeRepo();
    const outbox = new FakeOutbox();
    const useCase = new ApproveApplicationUseCase(
      repo as unknown as ClassesRepositoryPort,
      new FakeAudit(),
      outbox,
      new FakeIdempotency(),
      new FakeClock()
    );

    const result = await useCase.execute(
      {
        enrollmentId: "enr-1",
        priceCents: 34900,
        currency: "EUR",
        discountLabel: "Ưu đãi đợt 3",
      },
      ctx
    );

    expect(result.status).toBe("ENROLLED");
    expect(result.priceCents).toBe(34900);
    expect(result.discountLabel).toBe("Ưu đãi đợt 3");
    expect(outbox.events.length).toBe(1);
  });

  it("rejects approving enrollment not in APPLIED status", async () => {
    const repo = new FakeRepo();
    repo.enrollment.status = "ENROLLED";
    const useCase = new ApproveApplicationUseCase(
      repo as unknown as ClassesRepositoryPort,
      new FakeAudit(),
      new FakeOutbox(),
      new FakeIdempotency(),
      new FakeClock()
    );

    await expect(
      useCase.execute(
        {
          enrollmentId: "enr-1",
        },
        ctx
      )
    ).rejects.toBeInstanceOf(ValidationFailedError);
  });
});
