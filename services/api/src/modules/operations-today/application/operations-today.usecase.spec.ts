import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { UseCaseContext } from "@corely/kernel";
import { OperationsTodayUseCase } from "./operations-today.usecase";

const ctx: UseCaseContext = {
  tenantId: "tenant-a",
  workspaceId: "workspace-a",
  userId: "reviewer",
};
const scope = { tenantId: "tenant-a", workspaceId: "workspace-a", userId: "reviewer" };
const at = new Date("2030-03-31T09:00:00.000Z");
const end = new Date("2030-03-31T10:00:00.000Z");
const request = {
  id: "request-one",
  kind: "ABSENCE",
  status: "SUBMITTED",
  updatedAt: at.toISOString(),
} as const;

function fixture() {
  const workspace = { execute: vi.fn(async () => ({ name: "Example workspace" })) };
  const booking = {
    operationalTimezone: vi.fn(async () => "Europe/Berlin"),
    operationalAppointments: vi.fn(async () => [
      {
        id: "appointment-one",
        status: "CONFIRMED" as const,
        startAt: at,
        endAt: end,
        customerName: "Synthetic private customer",
        allocations: [{ resourceId: "synthetic-person", startAt: at, endAt: end }],
      },
    ]),
  };
  const tasks = {
    dueToday: vi.fn(async () =>
      Array.from({ length: 31 }, (_, index) => ({
        id: `task-${index}`,
        title: "Prepare studio",
        dueAt: at.toISOString(),
        status: "OPEN" as const,
        description: "Synthetic private task notes",
      }))
    ),
  };
  const requests = {
    list: vi.fn(async () => ({
      items: [],
      total: 0,
      hasMore: false,
      canSubmit: true,
      canReview: true,
      canManageRouting: false,
    })),
    inbox: vi.fn(async () => ({
      items: [{ ...request, reason: "Synthetic private absence reason" }],
      total: 1,
      hasMore: false,
      canSubmit: true,
      canManageRouting: false,
    })),
  };
  const availability = { windows: vi.fn(async () => []) };
  const entitlements = { isAppEnabled: vi.fn(async (_tenantId: string, _appId: string) => true) };
  const clock = { now: vi.fn(() => at) };
  return {
    workspace,
    booking,
    tasks,
    requests,
    availability,
    entitlements,
    clock,
    usecase: new OperationsTodayUseCase(
      workspace,
      booking,
      tasks,
      requests,
      availability,
      entitlements,
      clock
    ),
  };
}

describe("operations today", () => {
  it("shares the DST-aware civil day with owning sources, preserves counts and projects neutral records", async () => {
    const { usecase, workspace, booking, tasks, requests, availability } = fixture();
    const station = await usecase.execute(ctx);
    const window = {
      from: new Date("2030-03-30T23:00:00.000Z"),
      to: new Date("2030-03-31T22:00:00.000Z"),
    };
    expect(workspace.execute).toHaveBeenCalledWith(expect.objectContaining(scope));
    expect(booking.operationalAppointments).toHaveBeenCalledWith(window, ctx);
    expect(tasks.dueToday).toHaveBeenCalledWith(window, ctx);
    expect(requests.list).toHaveBeenCalledWith({ status: "RETURNED" }, ctx);
    expect(requests.inbox).toHaveBeenCalledWith({}, ctx);
    expect(availability.windows).toHaveBeenCalledWith(scope, "synthetic-person", at, end);
    expect(station).toMatchObject({
      date: "2030-03-31",
      timezone: "Europe/Berlin",
      timezoneSource: "booking",
      appointments: {
        status: "fresh",
        total: 1,
        items: [{ id: "appointment-one", href: "/openbuk/app/calendar" }],
      },
      tasks: { status: "fresh", total: 31 },
      decisions: {
        status: "fresh",
        total: 1,
        items: [{ id: request.id, href: "/requests/request-one" }],
      },
      exceptions: { status: "fresh", total: 1, items: [{ appointmentId: "appointment-one" }] },
    });
    expect(station.tasks.items).toHaveLength(25);
    expect(JSON.stringify(station)).not.toMatch(
      /customerName|private|reason|resourceId|allocations/
    );
  });

  it("preserves permitted work while other sources are restricted, disabled or unavailable", async () => {
    const { usecase, booking, availability, requests, entitlements, tasks } = fixture();
    booking.operationalAppointments.mockRejectedValue(new ForbiddenException());
    await expect(usecase.execute(ctx)).resolves.toMatchObject({
      appointments: { status: "restricted", observedAt: null, total: null, items: [] },
      exceptions: { status: "restricted", total: null },
      tasks: { status: "fresh", total: 31 },
    });
    expect(availability.windows).not.toHaveBeenCalled();

    entitlements.isAppEnabled.mockImplementation(async (_tenant, app) => app !== "booking");
    tasks.dueToday.mockRejectedValue(new Error("Synthetic lost source"));
    requests.inbox.mockRejectedValue(new Error("Synthetic lost reviewer source"));
    await expect(usecase.execute(ctx)).resolves.toMatchObject({
      timezone: "UTC",
      timezoneSource: "utc",
      appointments: { status: "disabled", total: null },
      decisions: { status: "partial", total: 0 },
      tasks: { status: "unavailable", total: null },
    });
  });

  it("rebuilds from current sources and flags a delayed read", async () => {
    const { usecase, tasks, clock } = fixture();
    const first = await usecase.execute(ctx);
    expect(first.tasks.total).toBe(31);
    tasks.dueToday.mockResolvedValue([]);
    clock.now.mockReset();
    for (let time = 0; time < 6; time++) {
      clock.now.mockReturnValueOnce(at);
    }
    clock.now.mockReturnValue(new Date(at.getTime() + 31_000));
    const next = await usecase.execute(ctx);
    expect(next.tasks).toMatchObject({ status: "stale", total: 0, observedAt: at.toISOString() });
    expect(next.evaluatedAt).not.toBe(next.tasks.observedAt);
    expect(first.tasks.total).toBe(31);
  });

  it("bounds a stalled source without losing its neighbors", async () => {
    const { usecase, tasks } = fixture();
    vi.useFakeTimers();
    try {
      tasks.dueToday.mockImplementation(() => new Promise(() => undefined));
      const reading = usecase.execute(ctx);
      await vi.advanceTimersByTimeAsync(5_000);
      await expect(reading).resolves.toMatchObject({
        appointments: { status: "fresh", total: 1 },
        tasks: { status: "unavailable", total: null, observedAt: null },
        decisions: { status: "fresh", total: 1 },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("authorizes the workspace before any owner or entitlement read", async () => {
    const { usecase, workspace, booking, entitlements } = fixture();
    workspace.execute.mockRejectedValue(new ForbiddenException());
    await expect(usecase.execute(ctx)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(usecase.execute({ ...ctx, workspaceId: undefined })).rejects.toBeInstanceOf(
      ForbiddenException
    );
    expect(booking.operationalTimezone).not.toHaveBeenCalled();
    expect(entitlements.isAppEnabled).not.toHaveBeenCalled();
  });
});
