import { describe, expect, it } from "vitest";
import type { UseCaseContext } from "@corely/kernel";
import { GetMonthlyBillingPreviewUseCase } from "../application/use-cases/get-monthly-billing-preview.usecase";
import type { ClassesRepositoryPort } from "../application/ports/classes-repository.port";
import type { ClassesSettingsRepositoryPort } from "../application/ports/classes-settings-repository.port";
import type { ClockPort } from "../application/ports/clock.port";

const buildCtx = (): UseCaseContext => ({
  tenantId: "tenant-1",
  workspaceId: "workspace-1",
  userId: "user-1",
  requestId: "req-1",
  correlationId: "corr-1",
  roles: [],
  metadata: {},
});

const BILLABLE_ROWS = [
  {
    payerClientId: "payer-a",
    classGroupId: "group-1",
    classGroupName: "Math",
    priceCents: 2000,
    currency: "EUR",
  },
  {
    payerClientId: "payer-a",
    classGroupId: "group-2",
    classGroupName: "Science",
    priceCents: 1500,
    currency: "EUR",
  },
];

const buildRepo = () =>
  ({
    async listBillableAttendanceForMonth(_tenantId: string, _workspaceId: string, filters: any) {
      if (filters.classGroupId) {
        return BILLABLE_ROWS.filter((row) => row.classGroupId === filters.classGroupId);
      }
      return BILLABLE_ROWS;
    },
    async listBillableScheduledForMonth() {
      return [];
    },
    async findBillingRunByMonth() {
      return {
        id: "run-1",
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        month: "2024-01",
        billingMonthStrategy: "ARREARS_PREVIOUS_MONTH",
        billingBasis: "ATTENDED_SESSIONS",
        billingSnapshot: null,
        status: "INVOICES_CREATED",
        runId: "run-id-1",
        generatedAt: new Date("2024-02-01T00:00:00.000Z"),
        createdByUserId: "user-1",
        createdAt: new Date("2024-02-01T00:00:00.000Z"),
        updatedAt: new Date("2024-02-01T00:00:00.000Z"),
      };
    },
    async listBillingInvoiceLinks() {
      return [
        {
          id: "link-legacy",
          tenantId: "tenant-1",
          workspaceId: "workspace-1",
          billingRunId: "run-1",
          payerClientId: "payer-a",
          classGroupId: null,
          invoiceId: "inv-legacy",
          idempotencyKey: "legacy",
          createdAt: new Date("2024-02-01T00:00:00.000Z"),
        },
        {
          id: "link-1",
          tenantId: "tenant-1",
          workspaceId: "workspace-1",
          billingRunId: "run-1",
          payerClientId: "payer-a",
          classGroupId: "group-1",
          invoiceId: "inv-1",
          idempotencyKey: "k1",
          createdAt: new Date("2024-02-01T00:00:00.000Z"),
        },
        {
          id: "link-2",
          tenantId: "tenant-1",
          workspaceId: "workspace-1",
          billingRunId: "run-1",
          payerClientId: "payer-a",
          classGroupId: "group-2",
          invoiceId: "inv-2",
          idempotencyKey: "k2",
          createdAt: new Date("2024-02-01T00:00:00.000Z"),
        },
      ];
    },
    async getInvoiceStatusesByIds(_workspaceId: string, invoiceIds: string[]) {
      return Object.fromEntries(invoiceIds.map((id) => [id, "ISSUED"]));
    },
  }) as unknown as ClassesRepositoryPort;

const settingsRepo: ClassesSettingsRepositoryPort = {
  async getSettings() {
    return {
      billingMonthStrategy: "ARREARS_PREVIOUS_MONTH",
      billingBasis: "ATTENDED_SESSIONS",
      bankAccount: null,
      paymentReferenceTemplate: null,
      attendanceMode: "MANUAL",
    };
  },
  async updateSettings() {
    throw new Error("not implemented");
  },
};

const clock: ClockPort = {
  now() {
    return new Date("2024-02-01T00:00:00.000Z");
  },
};

describe("GetMonthlyBillingPreviewUseCase invoice link scoping", () => {
  it("returns class-scoped invoice links for filtered class group", async () => {
    const useCase = new GetMonthlyBillingPreviewUseCase(buildRepo(), settingsRepo, clock);
    const output = await useCase.execute({ month: "2024-01", classGroupId: "group-1" }, buildCtx());

    expect(output.items).toHaveLength(1);
    expect(output.items[0]?.lines).toHaveLength(1);
    expect(output.items[0]?.lines[0]?.classGroupId).toBe("group-1");
    expect(output.invoiceLinks).toHaveLength(1);
    expect(output.invoiceLinks?.[0]).toMatchObject({
      payerClientId: "payer-a",
      classGroupId: "group-1",
      invoiceId: "inv-1",
      invoiceStatus: "ISSUED",
    });
  });

  it("does not leak legacy payer-level links into class-group filtered preview", async () => {
    const repo = buildRepo();
    repo.listBillingInvoiceLinks = async () => [
      {
        id: "link-legacy",
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        billingRunId: "run-1",
        payerClientId: "payer-a",
        classGroupId: null,
        invoiceId: "inv-legacy",
        idempotencyKey: "legacy",
        createdAt: new Date("2024-02-01T00:00:00.000Z"),
      },
    ];

    const useCase = new GetMonthlyBillingPreviewUseCase(repo, settingsRepo, clock);
    const output = await useCase.execute({ month: "2024-01", classGroupId: "group-1" }, buildCtx());

    expect(output.items).toHaveLength(1);
    expect(output.items[0]?.lines[0]?.classGroupId).toBe("group-1");
    expect(output.invoiceLinks).toEqual([]);
  });
});
