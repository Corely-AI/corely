import { describe, expect, it } from "vitest";
import type { ClassesRepositoryPort } from "../application/ports/classes-repository.port";
import { ListSessionsUseCase } from "../application/use-cases/list-sessions.usecase";
import type { ClassMonthlyBillingRunEntity } from "../domain/entities/classes.entities";

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
  public billingRuns: ClassMonthlyBillingRunEntity[] = [];
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
    throw new Error("not implemented");
  }
  async listSessions() {
    return {
      items: [
        {
          id: "session-jan",
          tenantId: "tenant-1",
          workspaceId: "workspace-1",
          classGroupId: "group-1",
          startsAt: new Date("2024-01-15T10:00:00.000Z"),
          endsAt: null,
          topic: null,
          notes: null,
          status: "PLANNED" as const,
          createdAt: new Date("2024-01-01T00:00:00.000Z"),
          updatedAt: new Date("2024-01-01T00:00:00.000Z"),
        },
        {
          id: "session-feb",
          tenantId: "tenant-1",
          workspaceId: "workspace-1",
          classGroupId: "group-1",
          startsAt: new Date("2024-02-10T10:00:00.000Z"),
          endsAt: null,
          topic: null,
          notes: null,
          status: "PLANNED" as const,
          createdAt: new Date("2024-02-01T00:00:00.000Z"),
          updatedAt: new Date("2024-02-01T00:00:00.000Z"),
        },
      ],
      total: 2,
    };
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
  async findBillingRunByMonth() {
    throw new Error("not implemented");
  }
  async listBillingRunsByMonths(
    tenantId: string,
    workspaceId: string,
    months: string[]
  ): Promise<ClassMonthlyBillingRunEntity[]> {
    return this.billingRuns.filter(
      (run) =>
        run.tenantId === tenantId && run.workspaceId === workspaceId && months.includes(run.month)
    );
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
    throw new Error("not implemented");
  }
}

describe("ListSessionsUseCase billing month status", () => {
  it("decorates sessions with billingMonthStatus based on month runs", async () => {
    const repo = new FakeRepo();
    repo.billingRuns = [
      {
        id: "run-jan",
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        month: "2024-01",
        status: "INVOICES_CREATED",
        runId: "run-jan",
        createdByUserId: "user-1",
        createdAt: new Date("2024-01-20T00:00:00.000Z"),
        updatedAt: new Date("2024-01-20T00:00:00.000Z"),
      },
    ];

    const useCase = new ListSessionsUseCase(repo);
    const result = await useCase.execute({ page: 1, pageSize: 20 }, ctx as any);

    const jan = result.items.find((item) => item.id === "session-jan");
    const feb = result.items.find((item) => item.id === "session-feb");

    expect(jan?.billingMonthStatus).toBe("INVOICES_CREATED");
    expect(feb?.billingMonthStatus).toBe("OPEN");
  });
});
