import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
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

describe("Staff lifecycle review entry point", () => {
  it("links the current profile to controlled onboarding/departure instead of archiving immediately", async () => {
    fixture.detail.mockResolvedValue({
      id: "staff-a",
      displayName: "Anna",
      version: 1,
      archivedAt: null,
    });
    fixture.command.mockReset();
    render(
      <MemoryRouter initialEntries={["/people/staff/staff-a"]}>
        <Routes>
          <Route path="/people/staff/:id/*" element={<StaffProfilePage />} />
        </Routes>
      </MemoryRouter>
    );
    const review = await screen.findByRole("link", { name: /Onboarding and departure/ });
    expect(review).toHaveAttribute("href", "/people/staff/staff-a/lifecycle");
    expect(screen.queryByRole("button", { name: "Archive staff member" })).not.toBeInTheDocument();
    expect(fixture.command).not.toHaveBeenCalled();
  });
});
