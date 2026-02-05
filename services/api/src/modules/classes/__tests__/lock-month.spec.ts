import { describe, expect, it } from "vitest";
import { BulkUpsertAttendanceUseCase } from "../application/use-cases/bulk-upsert-attendance.usecase";
import type { ClassesRepositoryPort } from "../application/ports/classes-repository.port";
import type { IdempotencyStoragePort } from "../application/ports/idempotency.port";
import type { IdGeneratorPort } from "../application/ports/id-generator.port";
import type { ClockPort } from "../application/ports/clock.port";
import type { AuditPort } from "../application/ports/audit.port";
import { ForbiddenError } from "@corely/domain";

const ctx = {
  tenantId: "tenant-1",
  workspaceId: "workspace-1",
  userId: "user-1",
  requestId: "req-1",
  correlationId: "corr-1",
  roles: [],
  metadata: {},
};

class FakeRepo implements ClassesRepositoryPort {
  async createClassGroup() {
    throw new Error("not implemented");
  }
  async updateClassGroup() {
    throw new Error("not implemented");
  }
  async findClassGroupById() {
    throw new Error("not implemented");
  }
  async listClassGroups() {
    throw new Error("not implemented");
  }
  async createSession() {
    throw new Error("not implemented");
  }
  async upsertSession() {
    throw new Error("not implemented");
  }
  async updateSession() {
    throw new Error("not implemented");
  }
  async findSessionById() {
    return {
      id: "session-1",
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      classGroupId: "group-1",
      startsAt: new Date("2024-01-15T10:00:00.000Z"),
      endsAt: null,
      topic: null,
      notes: null,
      status: "DONE",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  async listSessions() {
    throw new Error("not implemented");
  }
  async upsertEnrollment() {
    throw new Error("not implemented");
  }
  async updateEnrollment() {
    throw new Error("not implemented");
  }
  async findEnrollmentById() {
    throw new Error("not implemented");
  }
  async listEnrollments() {
    throw new Error("not implemented");
  }
  async listAttendanceBySession() {
    throw new Error("not implemented");
  }
  async bulkUpsertAttendance() {
    throw new Error("should not be called");
  }
  async listBillableAttendanceForMonth() {
    throw new Error("not implemented");
  }
  async findBillingRunByMonth() {
    throw new Error("not implemented");
  }
  async findBillingRunById() {
    throw new Error("not implemented");
  }
  async createBillingRun() {
    throw new Error("not implemented");
  }
  async updateBillingRun() {
    throw new Error("not implemented");
  }
  async listBillingInvoiceLinks() {
    throw new Error("not implemented");
  }
  async findBillingInvoiceLinkByIdempotency() {
    throw new Error("not implemented");
  }
  async createBillingInvoiceLink() {
    throw new Error("not implemented");
  }
  async isMonthLocked() {
    return true;
  }
}

class FakeIdempotency implements IdempotencyStoragePort {
  async get() {
    return null;
  }
  async store() {
    return;
  }
}

class FakeIdGen implements IdGeneratorPort {
  newId(): string {
    return "id-1";
  }
}

class FakeClock implements ClockPort {
  now(): Date {
    return new Date("2024-01-16T00:00:00.000Z");
  }
}

class FakeAudit implements AuditPort {
  async log() {
    return;
  }
}

describe("classes billing lock", () => {
  it("blocks attendance edits when month is locked", async () => {
    const useCase = new BulkUpsertAttendanceUseCase(
      new FakeRepo(),
      new FakeAudit(),
      new FakeIdempotency(),
      new FakeIdGen(),
      new FakeClock()
    );

    await expect(
      useCase.execute(
        {
          sessionId: "session-1",
          items: [{ enrollmentId: "enroll-1", status: "PRESENT", billable: true }],
        },
        ctx as any
      )
    ).rejects.toThrow(ForbiddenError);
  });
});
