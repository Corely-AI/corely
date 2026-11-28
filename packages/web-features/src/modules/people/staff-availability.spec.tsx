import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StaffAvailabilityView } from "@corely/contracts";
import type * as PeopleHooks from "./use-people";
import { StaffAvailabilityForm } from "./staff-availability-form";
import { StaffAvailability } from "./staff-availability";
import { availabilityCopy } from "./availability-copy";
import { peopleCopy } from "./people-copy";
const fixture = vi.hoisted(() => ({
  save: vi.fn(),
  load: vi.fn(),
  scope: "workspace-a",
  manage: true,
}));
vi.mock("./people-api", () => ({
  peopleApi: { saveAvailability: fixture.save, availability: fixture.load },
}));
vi.mock("./use-people", async (original) => ({
  ...(await original<typeof PeopleHooks>()),
  usePeopleAccess: () => ({
    scope: fixture.scope,
    locale: "en",
    copy: peopleCopy.en,
    can: () => fixture.manage,
  }),
}));
const value = (): StaffAvailabilityView => ({
  version: 0,
  profileVersion: 1,
  resourceId: null,
  evaluatedAt: "2026-11-07T12:00:00.000Z",
  affectedCommitments: [],
  plans: [],
});
function form(onSaved = vi.fn()) {
  render(
    <StaffAvailabilityForm
      id="staff"
      value={value()}
      copy={availabilityCopy.en}
      onSaved={onSaved}
      onReload={vi.fn()}
    />
  );
  fireEvent.change(screen.getByLabelText("Effective from", { exact: true }), {
    target: { value: "2030-01-01" },
  });
  return onSaved;
}
beforeEach(() => {
  fixture.save.mockReset();
  fixture.load.mockReset();
  fixture.scope = "workspace-a";
  fixture.manage = true;
});
describe("Staff availability editing", () => {
  it("publishes overnight recurring hours and neutral closed exceptions with both versions", async () => {
    fixture.save.mockResolvedValue({});
    const saved = form();
    fireEvent.click(screen.getByRole("button", { name: "Add recurring hours" }));
    fireEvent.change(screen.getByLabelText("Start 1", { exact: true }), {
      target: { value: "22:00" },
    });
    fireEvent.change(screen.getByLabelText("End 1", { exact: true }), {
      target: { value: "02:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add dated exception" }));
    fireEvent.click(screen.getByRole("button", { name: "Publish pattern" }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(fixture.save.mock.calls[0][1]).toMatchObject({
      version: 0,
      profileVersion: 1,
      pattern: {
        weeklyHours: [{ dayOfWeek: 1, startTime: "22:00", endTime: "02:00" }],
        exceptions: [{ date: "2030-01-01", windows: [] }],
      },
    });
  });
  it("rejects overlapping hours before sending and preserves the draft after errors", async () => {
    form();
    fireEvent.click(screen.getByRole("button", { name: "Add recurring hours" }));
    fireEvent.click(screen.getByRole("button", { name: "Add recurring hours" }));
    fireEvent.click(screen.getByRole("button", { name: "Publish pattern" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Check dates");
    expect(fixture.save).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Start 1", { exact: true })).toHaveValue("09:00");
  });
  it("reuses the idempotency key on an unchanged retry and ignores late completion after unmount", async () => {
    fixture.save.mockRejectedValueOnce(new Error("Network unavailable"));
    let complete: (value: object) => void = () => undefined;
    fixture.save.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        })
    );
    const saved = form();
    fireEvent.click(screen.getByRole("button", { name: "Publish pattern" }));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Publish pattern" }));
    await waitFor(() => expect(fixture.save).toHaveBeenCalledTimes(2));
    expect(fixture.save.mock.calls[0][2]).toBe(fixture.save.mock.calls[1][2]);
    // The routed form's lifetime ends before the response arrives.
    const { cleanup } = await import("@testing-library/react");
    cleanup();
    await act(async () => complete({}));
    expect(saved).not.toHaveBeenCalled();
  });
  it("does not retrieve raw patterns without management permission", () => {
    fixture.manage = false;
    render(
      <MemoryRouter>
        <StaffAvailability id="staff" archived={false} />
      </MemoryRouter>
    );
    expect(screen.queryByRole("heading", { name: "Working patterns" })).not.toBeInTheDocument();
    expect(fixture.load).not.toHaveBeenCalled();
  });
  it("discards responses from a previous workspace and supports retry", async () => {
    let complete: (value: StaffAvailabilityView) => void = () => undefined;
    fixture.load
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            complete = resolve;
          })
      )
      .mockRejectedValueOnce(new Error("Denied"))
      .mockResolvedValue(value());
    const tree = () => (
      <MemoryRouter>
        <StaffAvailability id="staff" archived={false} />
      </MemoryRouter>
    );
    const view = render(tree());
    fixture.scope = "workspace-b";
    view.rerender(tree());
    await screen.findByText("Unable to load working patterns.");
    await act(async () =>
      complete({
        ...value(),
        resourceId: "OLD-WORKSPACE",
        affectedCommitments: [
          {
            id: "OLD-BOOKING",
            kind: "booking",
            startAt: "2030-01-01T09:00:00Z",
            endAt: "2030-01-01T10:00:00Z",
          },
        ],
      })
    );
    expect(screen.queryByText("OLD-BOOKING")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByLabelText("Effective from", { exact: true });
    expect(screen.getByText("No working pattern published")).toBeInTheDocument();
  });
});
