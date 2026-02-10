import { describe, expect, it } from "vitest";
import { ForbiddenError } from "@corely/domain";
import type { ClassesRepositoryPort } from "../application/ports/classes-repository.port";
import { UpdateSessionUseCase } from "../application/use-cases/update-session.usecase";
import type {
  ClassMonthlyBillingRunEntity,
  ClassSessionEntity,
} from "../domain/entities/classes.entities";
import type { ClassesSettingsRepositoryPort } from "../application/ports/classes-settings-repository.port";

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
  public session: ClassSessionEntity = {
    id: "session-1",
    tenantId: "tenant-1",
    workspaceId: "workspace-1",
    classGroupId: "group-1",
    startsAt: new Date("2024-01-15T10:00:00.000Z"),
    endsAt: null,
    topic: null,
    notes: null,
    status: "PLANNED",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  };
  public billingRun: ClassMonthlyBillingRunEntity = {
    id: "run-jan",
    tenantId: "tenant-1",
    workspaceId: "workspace-1",
    month: "2024-01",
    status: "LOCKED",
    runId: "run-jan",
    createdByUserId: "user-1",
    createdAt: new Date("2024-01-20T00:00:00.000Z"),
    updatedAt: new Date("2024-01-20T00:00:00.000Z"),
  };
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
  async listClassGroupsWithSchedulePattern() {
    return [];
  }
  async createSession() {
    throw new Error("not implemented");
  }
  async upsertSession() {
    throw new Error("not implemented");
  }
  async updateSession(
    tenantId: string,
    workspaceId: string,
    sessionId: string,
    updates: Partial<ClassSessionEntity>
  ): Promise<ClassSessionEntity> {
    const definedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => typeof value !== "undefined")
    ) as Partial<ClassSessionEntity>;
    this.session = { ...this.session, ...definedUpdates, updatedAt: new Date() };
    return this.session;
  }
  async findSessionById() {
    return this.session;
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
    throw new Error("not implemented");
  }
  async listBillableAttendanceForMonth() {
    throw new Error("not implemented");
  }
  async listBillableScheduledForMonth() {
    throw new Error("not implemented");
  }
  async findBillingRunByMonth() {
    return this.billingRun;
  }
  async listBillingRunsByMonths() {
    return [this.billingRun];
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
  async deleteBillingInvoiceLinks() {
    throw new Error("not implemented");
  }
}

class FakeAudit {
  async log() {
    return;
  }
}

class FakeSettingsRepo implements ClassesSettingsRepositoryPort {
  async getSettings() {
    return {
      billingMonthStrategy: "ARREARS_PREVIOUS_MONTH",
      billingBasis: "ATTENDED_SESSIONS",
      bankAccount: null,
      paymentReferenceTemplate: null,
    };
  }
  async updateSettings() {
    throw new Error("not implemented");
  }
}

class FakeClock {
  now(): Date {
    return new Date("2024-01-21T00:00:00.000Z");
  }
}

describe("UpdateSessionUseCase month lock rules", () => {
  it("blocks status changes when month is locked", async () => {
    const repo = new FakeRepo();
    const useCase = new UpdateSessionUseCase(
      repo,
      new FakeSettingsRepo(),
      new FakeAudit() as any,
      new FakeClock() as any,
      { newId: () => "id-1" }
    );

    await expect(
      useCase.execute({ sessionId: "session-1", status: "DONE" }, ctx as any)
    ).rejects.toThrow(ForbiddenError);
  });

  it("allows non-billing edits when month is locked", async () => {
    const repo = new FakeRepo();
    const useCase = new UpdateSessionUseCase(
      repo,
      new FakeSettingsRepo(),
      new FakeAudit() as any,
      new FakeClock() as any,
      { newId: () => "id-1" }
    );

    const result = await useCase.execute(
      { sessionId: "session-1", notes: "Updated note" },
      ctx as any
    );

    expect(result.notes).toBe("Updated note");
    expect(result.billingMonthStatus).toBe("LOCKED");
  });
});
