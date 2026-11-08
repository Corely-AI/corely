import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as PeopleHooks from "./use-people";
import { peopleCopy } from "./people-copy";
import { StaffProfilePage } from "./staff-profile-page";
const fixture = vi.hoisted(() => ({ name: "Original name", detail: vi.fn(), command: vi.fn() }));
vi.mock("./people-api", () => ({
  peopleApi: { detail: fixture.detail, command: fixture.command },
}));
vi.mock("./use-people", async (original) => ({
  ...(await original<typeof PeopleHooks>()),
  usePeopleAccess: () => ({
    scope: "workspace-a",
    loading: false,
    copy: peopleCopy.en,
    can: () => true,
  }),
}));
vi.mock("./staff-absences", () => ({ StaffAbsences: () => null }));
vi.mock("./staff-availability", () => ({ StaffAvailability: () => null }));
vi.mock("./staff-private-details", () => ({ StaffPrivateDetails: () => null }));
vi.mock("./staff-profile-form", () => ({
  StaffProfileForm: () => {
    const navigate = useNavigate();
    return (
      <button
        onClick={() => {
          fixture.name = "Updated name";
          navigate("/people/staff/staff");
        }}
      >
        Save test profile
      </button>
    );
  },
}));
describe("Staff edit-to-detail refresh", () => {
  it("reloads the saved record when navigation reuses the same profile component", async () => {
    fixture.detail.mockImplementation(async () => ({
      id: "staff",
      displayName: fixture.name,
      version: 1,
      archivedAt: null,
    }));
    render(
      <MemoryRouter initialEntries={["/people/staff/staff/edit"]}>
        <Routes>
          <Route path="/people/staff/:id/*" element={<StaffProfilePage />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByRole("button", { name: "Save test profile" });
    fireEvent.click(screen.getByRole("button", { name: "Save test profile" }));
    await screen.findByRole("heading", { name: "Updated name" });
    await waitFor(() => expect(fixture.detail).toHaveBeenCalledTimes(2));
  });
});

function NavigationControl() {
  const navigate = useNavigate();
  return <button onClick={() => navigate("/people/staff/staff-b")}>Switch staff record</button>;
}
describe("Staff archive target isolation", () => {
  beforeEach(() => {
    fixture.detail.mockReset();
    fixture.command.mockReset();
    fixture.detail.mockImplementation(async (id: string) => ({
      id,
      displayName: id,
      version: 1,
      archivedAt: null,
    }));
  });
  it("cancels an open archive confirmation when the routed staff record changes", async () => {
    render(
      <MemoryRouter initialEntries={["/people/staff/staff-a"]}>
        <NavigationControl />
        <Routes>
          <Route path="/people/staff/:id/*" element={<StaffProfilePage />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByRole("heading", { name: "staff-a" });
    fireEvent.click(screen.getByRole("button", { name: "Archive staff member", exact: true }));
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "Switch staff record", hidden: true }));
    await screen.findByRole("heading", { name: "staff-b", hidden: true });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(fixture.command).not.toHaveBeenCalled();
  });
  it("does not reload a newly selected record when an old archive response arrives", async () => {
    let complete: (value: object) => void = () => undefined;
    fixture.command.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        })
    );
    render(
      <MemoryRouter initialEntries={["/people/staff/staff-a"]}>
        <NavigationControl />
        <Routes>
          <Route path="/people/staff/:id/*" element={<StaffProfilePage />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByRole("heading", { name: "staff-a" });
    fireEvent.click(screen.getByRole("button", { name: "Archive staff member", exact: true }));
    fireEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Archive staff member",
        exact: true,
      })
    );
    fireEvent.click(screen.getByRole("button", { name: "Switch staff record", hidden: true }));
    await screen.findByRole("heading", { name: "staff-b" });
    await act(async () => {
      complete({ id: "staff-a", archivedAt: "2026-11-07T12:00:00Z" });
    });
    expect(fixture.command).toHaveBeenCalledWith(
      "/staff-a/archive",
      "POST",
      { version: 1 },
      expect.any(String)
    );
    expect(fixture.detail).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("heading", { name: "staff-b" })).toBeInTheDocument();
  });
});
