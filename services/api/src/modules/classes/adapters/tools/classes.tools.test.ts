import { describe, expect, it, vi } from "vitest";
import { buildClassesTools } from "./classes.tools";
import type { GetClassGroupUseCase } from "../../application/use-cases/get-class-group.usecase";
import type { GetSessionAttendanceUseCase } from "../../application/use-cases/get-session-attendance.usecase";
import type { GetSessionUseCase } from "../../application/use-cases/get-session.usecase";
import type { GetTeacherDashboardSummaryUseCase } from "../../application/use-cases/get-teacher-dashboard-summary.use-case";
import type { GetTeacherDashboardUnpaidInvoicesUseCase } from "../../application/use-cases/get-teacher-dashboard-unpaid-invoices.use-case";
import type { ListClassGroupsUseCase } from "../../application/use-cases/list-class-groups.usecase";
import type { ListEnrollmentsUseCase } from "../../application/use-cases/list-enrollments.usecase";
import type { ListSessionsUseCase } from "../../application/use-cases/list-sessions.usecase";
import type { UpdateSessionUseCase } from "../../application/use-cases/update-session.usecase";
import type { BulkUpsertAttendanceUseCase } from "../../application/use-cases/bulk-upsert-attendance.usecase";

const makeDeps = () => ({
  getSummary: {
    execute: vi.fn().mockResolvedValue({
      range: { dateFrom: "2026-02-01T00:00:00.000Z", dateTo: "2026-02-28T23:59:59.000Z" },
      counts: {
        todaySessions: 1,
        weekSessions: 2,
        missingAttendance: 0,
        unfinishedPastSessions: 0,
        studentsMissingPayer: 0,
      },
      upcomingSessions: [],
      needsAttention: {
        missingAttendanceSessions: [],
        unfinishedPastSessions: [],
        studentsMissingPayer: [],
      },
      attendanceMode: "MANUAL" as const,
    }),
  } as unknown as GetTeacherDashboardSummaryUseCase,
  getUnpaidInvoices: {
    execute: vi.fn().mockResolvedValue({ count: 0 }),
  } as unknown as GetTeacherDashboardUnpaidInvoicesUseCase,
  listClassGroups: {
    execute: vi
      .fn()
      .mockResolvedValue({ items: [], pageInfo: { page: 1, pageSize: 50, total: 0 } }),
  } as unknown as ListClassGroupsUseCase,
  listSessions: {
    execute: vi
      .fn()
      .mockResolvedValue({ items: [], pageInfo: { page: 1, pageSize: 50, total: 0 } }),
  } as unknown as ListSessionsUseCase,
  getSession: {
    execute: vi.fn().mockResolvedValue({
      id: "session-1",
      classGroupId: "group-1",
      startsAt: new Date("2026-02-05T10:00:00.000Z"),
      status: "PLANNED",
    }),
  } as unknown as GetSessionUseCase,
  getSessionAttendance: {
    execute: vi.fn().mockResolvedValue({ items: [], locked: false }),
  } as unknown as GetSessionAttendanceUseCase,
  listEnrollments: {
    execute: vi
      .fn()
      .mockResolvedValue({ items: [], pageInfo: { page: 1, pageSize: 50, total: 0 } }),
  } as unknown as ListEnrollmentsUseCase,
  getClassGroup: {
    execute: vi.fn().mockResolvedValue({
      id: "group-1",
      name: "Math A1",
      subject: "Math",
      level: "A1",
      status: "ACTIVE",
    }),
  } as unknown as GetClassGroupUseCase,
  updateSession: {
    execute: vi.fn().mockResolvedValue({
      id: "session-1",
      classGroupId: "group-1",
      status: "DONE",
      startsAt: new Date("2026-02-05T10:00:00.000Z"),
    }),
  } as unknown as UpdateSessionUseCase,
  bulkUpsertAttendance: {
    execute: vi.fn().mockResolvedValue([]),
  } as unknown as BulkUpsertAttendanceUseCase,
});

describe("classes tools", () => {
  it("passes tenant/workspace context to teacher dashboard summary use case", async () => {
    const deps = makeDeps();
    const tool = buildClassesTools(deps).find(
      (item) => item.name === "classes_getTeacherDashboardSummary"
    );
    expect(tool).toBeDefined();

    const result = await tool?.execute?.({
      tenantId: "tenant-1",
      workspaceId: "workspace-9",
      userId: "user-1",
      input: {
        dateFrom: "2026-02-01T00:00:00.000Z",
        dateTo: "2026-02-28T23:59:59.000Z",
      },
      toolCallId: "tool-1",
    });

    expect(result).toMatchObject({ attendanceMode: "MANUAL" });
    expect((deps.getSummary as any).execute).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        workspaceId: "workspace-9",
        userId: "user-1",
        correlationId: "tool-1",
      }),
      expect.objectContaining({
        dateFrom: "2026-02-01T00:00:00.000Z",
        dateTo: "2026-02-28T23:59:59.000Z",
      })
    );
  });

  it("falls back workspaceId to tenantId when workspaceId is missing", async () => {
    const deps = makeDeps();
    const tool = buildClassesTools(deps).find(
      (item) => item.name === "classes_getTeacherDashboardUnpaidInvoices"
    );
    expect(tool).toBeDefined();

    await tool?.execute?.({
      tenantId: "tenant-1",
      userId: "user-1",
      input: {},
      toolCallId: "tool-2",
    });

    expect((deps.getUnpaidInvoices as any).execute).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        workspaceId: "tenant-1",
      }),
      {}
    );
  });

  it("marks write tools with approval gating", () => {
    const deps = makeDeps();
    const tools = buildClassesTools(deps);

    const markDone = tools.find((tool) => tool.name === "classes_markSessionDone");
    const bulkUpsert = tools.find((tool) => tool.name === "classes_bulkUpsertAttendance");

    expect(markDone?.needsApproval).toBe(true);
    expect(markDone?.kind).toBe("server");
    expect(bulkUpsert?.needsApproval).toBe(true);
    expect(bulkUpsert?.kind).toBe("server");
  });
});
