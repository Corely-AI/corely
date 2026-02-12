import { describe, expect, it, vi } from "vitest";
import { buildClassesTools } from "./classes.tools";
import type { GetTeacherDashboardSummaryUseCase } from "../../application/use-cases/get-teacher-dashboard-summary.use-case";
import type { GetTeacherDashboardUnpaidInvoicesUseCase } from "../../application/use-cases/get-teacher-dashboard-unpaid-invoices.use-case";

describe("classes tools", () => {
  it("passes tenant/workspace context to teacher dashboard summary use case", async () => {
    const summary = {
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
    };
    const getSummary = {
      execute: vi.fn().mockResolvedValue(summary),
    } as unknown as GetTeacherDashboardSummaryUseCase;
    const getUnpaidInvoices = {
      execute: vi.fn(),
    } as unknown as GetTeacherDashboardUnpaidInvoicesUseCase;

    const tool = buildClassesTools({ getSummary, getUnpaidInvoices }).find(
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

    expect(result).toEqual(summary);
    expect((getSummary as any).execute).toHaveBeenCalledWith(
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
    const getSummary = {
      execute: vi.fn().mockResolvedValue({ ok: true }),
    } as unknown as GetTeacherDashboardSummaryUseCase;
    const getUnpaidInvoices = {
      execute: vi.fn().mockResolvedValue({ count: 0 }),
    } as unknown as GetTeacherDashboardUnpaidInvoicesUseCase;

    const tool = buildClassesTools({ getSummary, getUnpaidInvoices }).find(
      (item) => item.name === "classes_getTeacherDashboardUnpaidInvoices"
    );
    expect(tool).toBeDefined();

    await tool?.execute?.({
      tenantId: "tenant-1",
      userId: "user-1",
      input: {},
      toolCallId: "tool-2",
    });

    expect((getUnpaidInvoices as any).execute).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        workspaceId: "tenant-1",
      }),
      {}
    );
  });
});
