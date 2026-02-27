import { describe, expect, it } from "vitest";
import { BulkUpsertAttendanceUseCase } from "../application/use-cases/bulk-upsert-attendance.usecase";
import type { ClassesRepositoryPort } from "../application/ports/classes-repository.port";
import type { IdempotencyStoragePort } from "../application/ports/idempotency.port";
import type { IdGeneratorPort } from "../application/ports/id-generator.port";
import type { ClockPort } from "../application/ports/clock.port";
import type { AuditPort } from "../application/ports/audit.port";
import { ForbiddenError } from "@corely/domain";
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
  async listClassGroupInstructors() {
    return [];
  }
  async replaceClassGroupInstructors() {
    return [];
  }
  async createProgram() {
    throw new Error("not implemented");
  }
  async updateProgram() {
    throw new Error("not implemented");
  }
  async findProgramById() {
    return null;
  }
  async deleteProgram() {
    return;
  }
  async listPrograms() {
    return { items: [], total: 0 };
  }
  async replaceProgramSessionTemplates() {
    return [];
  }
  async replaceProgramMilestoneTemplates() {
    return [];
  }
  async listProgramSessionTemplates() {
    return [];
  }
  async listProgramMilestoneTemplates() {
    return [];
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
  async findEnrollmentBillingPlan() {
    return null;
  }
  async upsertEnrollmentBillingPlan() {
    throw new Error("not implemented");
  }
  async listAttendanceBySession() {
    return [];
  }
  async bulkUpsertAttendance() {
    throw new Error("should not be called");
  }
  async listBillableAttendanceForMonth() {
    throw new Error("not implemented");
  }
  async listBillableScheduledForMonth() {
    throw new Error("not implemented");
  }
  async findBillingRunByMonth() {
    throw new Error("not implemented");
  }
  async listBillingRunsByMonths() {
    return [];
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
  async listBillingInvoiceLinksByEnrollment() {
    return [];
  }
  async findBillingInvoiceLinkByIdempotency() {
    throw new Error("not implemented");
  }
  async createBillingInvoiceLink() {
    throw new Error("not implemented");
  }
  async listMilestonesByClassGroup() {
    return [];
  }
  async createMilestone() {
    throw new Error("not implemented");
  }
  async updateMilestone() {
    throw new Error("not implemented");
  }
  async deleteMilestone() {
    throw new Error("not implemented");
  }
  async findMilestoneById() {
    return null;
  }
  async upsertMilestoneCompletion() {
    throw new Error("not implemented");
  }
  async listMilestoneCompletionsByClassGroup() {
    return [];
  }
  async listResourcesByClassGroup() {
    return [];
  }
  async createResource() {
    throw new Error("not implemented");
  }
  async updateResource() {
    throw new Error("not implemented");
  }
  async deleteResource() {
    throw new Error("not implemented");
  }
  async reorderResources() {
    return;
  }
  async findResourceById() {
    return null;
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
      new FakeSettingsRepo(),
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
