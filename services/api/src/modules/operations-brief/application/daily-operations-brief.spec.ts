import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { DailyOperationsBrief } from "./daily-operations-brief";

const scope = {
  tenantId: "tenant",
  workspaceId: "workspace",
  userId: "manager",
  workspaceName: "Berlin Mitte",
};

function fixture() {
  const startAt = new Date("2026-10-26T09:00:00Z");
  const endAt = new Date("2026-10-26T09:30:00Z");
  const appointment = {
    id: "booking-1",
    status: "CONFIRMED",
    startAt,
    endAt,
    customerName: "private contact",
    allocations: [{ resourceId: "staff-resource", startAt, endAt }],
  };
  const booking = {
    operationalTimezone: vi.fn(async () => "Europe/Berlin"),
    operationalAppointments: vi.fn(async () => [appointment]),
  };
  const availability = {
    windows: vi.fn(async () => [
      { startAt: startAt.toISOString(), endAt: "2026-10-26T09:15:00.000Z" },
    ]),
  };
  const tasks = {
    list: vi.fn(async () => ({
      page: 1,
      pageSize: 100,
      total: 1,
      capabilities: { manage: true, completeOwn: false },
      items: [
        {
          id: "8157b010-8547-4eaf-929b-2e3fb56b6d85",
          workspaceId: scope.workspaceId,
          title: "Open studio",
          dueAt: "2026-10-26T09:00:00.000Z",
          version: 1,
          status: "OPEN" as const,
          ownerStaffId: "2eab3504-0105-4a63-8e20-cc38094f1eb7",
          ownerName: "Desk",
          ownerArchived: false,
          completedAt: null,
          createdAt: "2026-10-26T08:00:00.000Z",
          updatedAt: "2026-10-26T08:00:00.000Z",
          checklist: [{ id: "step-1", title: "Prepare the desk", completed: false }],
        },
      ],
    })),
  };
  const entitlements = { isAppEnabled: vi.fn(async (_tenant: string, _id: string) => true) };
  const clock = { now: vi.fn(() => new Date("2026-10-25T23:15:00Z")) };
  return {
    booking,
    availability,
    tasks,
    entitlements,
    clock,
    brief: new DailyOperationsBrief(booking, availability, tasks, entitlements, clock),
  };
}

describe("daily operations brief", () => {
  it("uses the studio day and reports a neutral coverage conflict with no customer fields", async () => {
    const f = fixture();
    const result = await f.brief.execute(scope, "today");
    expect(result).toMatchObject({
      date: "2026-10-26",
      timezone: "Europe/Berlin",
      timezoneSource: "openbuk",
      appointments: { status: "fresh", total: 1 },
      coverage: {
        status: "fresh",
        total: 1,
        items: [{ appointmentId: "booking-1", sourcePath: "/openbuk/app" }],
      },
      tasks: {
        total: 1,
        items: [
          {
            title: "Open studio",
            checklist: { done: 0, total: 1 },
            sourcePath: "/openbuk/app/tasks",
          },
        ],
      },
    });
    expect(JSON.stringify(result)).not.toContain("private contact");
    expect(JSON.stringify(result)).not.toContain("staff-resource");
    expect(f.availability.windows).toHaveBeenCalledWith(
      { tenantId: scope.tenantId, workspaceId: scope.workspaceId },
      "staff-resource",
      new Date("2026-10-26T09:00:00Z"),
      new Date("2026-10-26T09:30:00Z")
    );
    expect(f.entitlements.isAppEnabled.mock.calls.map(([, id]) => id)).not.toContain("invoices");
  });

  it("distinguishes empty, unavailable and restricted sources", async () => {
    const f = fixture();
    f.booking.operationalAppointments.mockResolvedValue([]);
    f.tasks.list.mockRejectedValueOnce(new Error("synthetic source failure"));
    const partial = await f.brief.execute(scope, "2026-10-26");
    expect(partial.appointments).toMatchObject({ status: "fresh", total: 0, items: [] });
    expect(partial.coverage).toMatchObject({ status: "fresh", total: 0 });
    expect(partial.tasks).toEqual({
      status: "unavailable",
      observedAt: null,
      total: null,
      items: [],
    });
    f.tasks.list.mockRejectedValueOnce(new ForbiddenException());
    expect((await f.brief.execute(scope, "today")).tasks.status).toBe("restricted");
  });

  it("leaves tasks available in a workspace with Booking disabled and labels the UTC fallback", async () => {
    const f = fixture();
    f.entitlements.isAppEnabled.mockImplementation(async (_tenant, id) => id !== "booking");
    const data = await f.brief.execute(scope, "today");
    expect(data).toMatchObject({
      date: "2026-10-25",
      timezone: "UTC",
      timezoneSource: "utc-default",
      appointments: { status: "disabled", total: null },
      coverage: { status: "disabled" },
      tasks: { status: "fresh", total: 1 },
    });
    expect(f.booking.operationalTimezone).not.toHaveBeenCalled();
  });

  it("marks an older reading stale without replacing it with zero", async () => {
    const f = fixture();
    const old = new Date("2026-10-25T23:15:00Z");
    f.availability.windows.mockImplementationOnce(async () => {
      f.clock.now.mockReturnValue(new Date("2026-10-25T23:17:00Z"));
      return [];
    });
    const result = await f.brief.execute(scope, "today");
    expect(result.tasks).toMatchObject({
      status: "stale",
      observedAt: old.toISOString(),
      total: 1,
    });
  });
});
