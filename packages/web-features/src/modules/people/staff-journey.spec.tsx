import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { StaffSelfView, StaffLifecycleView } from "@corely/contracts";
import { StaffSelfService } from "./staff-self-service";
import { StaffLifecycle } from "./staff-lifecycle";
import type { StaffJourneyClient } from "./staff-journey-client";
const profile = {
  id: "anna",
  workspaceId: "workspace-a",
  displayName: "Anna",
  jobTitle: "Stylist",
  team: "Studio",
  location: null,
  managerStaffId: null,
  resourceId: null,
  version: 1,
  archivedAt: null,
  createdAt: "2026-11-08T00:00:00Z",
  updatedAt: "2026-11-08T00:00:00Z",
};
const self: StaffSelfView = {
  profile,
  canEdit: true,
  contacts: { personalEmail: "anna-private@example.invalid", personalPhone: null, version: 0 },
  availability: { version: 0, plans: [] },
  onboardingTask: null,
  tasksAvailable: true,
};
const lifecycle: StaffLifecycleView = {
  profile,
  onboardingTask: null,
  tasks: { available: true, openTaskCount: 0, openTasks: [], recurringTemplates: [] },
  bookings: [],
  access: { linked: true, status: "ACTIVE", canDisable: true },
};
function fixture(status = 500): StaffJourneyClient {
  return {
    self: vi.fn(async () => self),
    saveSelf: vi.fn(async () => {
      throw { status };
    }),
    lifecycle: vi.fn(async () => lifecycle),
    lifecycleCommand: vi.fn(async () => {
      throw { status };
    }),
  };
}
describe("Staff self-service current scope and authority", () => {
  it("submits only own editable fields with subject/version preconditions and reuses an uncertain retry key", async () => {
    const client = fixture();
    render(
      <MemoryRouter>
        <StaffSelfService client={client} />
      </MemoryRouter>
    );
    fireEvent.click(await screen.findByRole("button", { name: "Edit your details" }));
    expect(screen.getByLabelText("Display name")).toHaveFocus();
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Anna changed" } });
    fireEvent.click(screen.getByRole("button", { name: "Save your details" }));
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Display name")).toHaveValue("Anna changed");
    fireEvent.click(screen.getByRole("button", { name: "Save your details" }));
    await waitFor(() => expect(client.saveSelf).toHaveBeenCalledTimes(2));
    const calls = vi.mocked(client.saveSelf).mock.calls;
    expect(calls[0][1]).toBe(calls[1][1]);
    expect(calls[0][0]).toEqual({
      profileId: "anna",
      displayName: "Anna changed",
      personalEmail: "anna-private@example.invalid",
      personalPhone: null,
      version: 1,
      contactsVersion: 0,
    });
    expect(screen.queryByLabelText(/manager|role|team|notes/i)).not.toBeInTheDocument();
  });
  it.each([401, 403, 404])(
    "clears own contacts and draft after current authority is denied (%s)",
    async (status) => {
      const client = fixture(status);
      render(
        <MemoryRouter>
          <StaffSelfService client={client} />
        </MemoryRouter>
      );
      fireEvent.click(await screen.findByRole("button", { name: "Edit your details" }));
      fireEvent.click(screen.getByRole("button", { name: "Save your details" }));
      await screen.findByRole("alert");
      expect(screen.queryByDisplayValue("anna-private@example.invalid")).not.toBeInTheDocument();
      expect(screen.queryByText("anna-private@example.invalid")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Edit your details" })).not.toBeInTheDocument();
    }
  );
  it("hides edit controls for a subject with read-only permission", async () => {
    const client = fixture();
    vi.mocked(client.self).mockResolvedValue({ ...self, canEdit: false });
    render(
      <MemoryRouter>
        <StaffSelfService client={client} />
      </MemoryRouter>
    );
    await screen.findByRole("heading", { name: "Anna" });
    expect(screen.queryByRole("button", { name: "Edit your details" })).not.toBeInTheDocument();
  });
  it("cannot paint an old command response into a newly selected workspace", async () => {
    const a = fixture(),
      b = fixture();
    let resolve: (value: StaffSelfView) => void = () => undefined;
    vi.mocked(a.saveSelf).mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        })
    );
    vi.mocked(b.self).mockResolvedValue({
      ...self,
      profile: { ...profile, id: "ben", displayName: "Ben", workspaceId: "workspace-b" },
      contacts: { ...self.contacts, personalEmail: "ben@example.invalid" },
    });
    const view = render(
      <MemoryRouter>
        <StaffSelfService client={a} />
      </MemoryRouter>
    );
    fireEvent.click(await screen.findByRole("button", { name: "Edit your details" }));
    fireEvent.click(screen.getByRole("button", { name: "Save your details" }));
    view.rerender(
      <MemoryRouter>
        <StaffSelfService client={b} />
      </MemoryRouter>
    );
    await waitFor(() =>
      expect(screen.queryByDisplayValue("anna-private@example.invalid")).not.toBeInTheDocument()
    );
    await act(async () => {
      resolve({ ...self, profile: { ...profile, displayName: "Old successful response" } });
    });
    expect(screen.queryByText("Old successful response")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Personal email")).toHaveValue("ben@example.invalid");
  });
  it.each([
    ["de", "Ihr Mitarbeiterprofil"],
    ["vi", "Hồ sơ nhân viên của bạn"],
  ])("renders own self-service in %s", async (locale, title) => {
    render(
      <MemoryRouter>
        <StaffSelfService client={fixture()} locale={locale} />
      </MemoryRouter>
    );
    await screen.findByRole("heading", { name: "Anna" });
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
  });
});
describe("Manager departure review", () => {
  it("requires explicit access disablement and sends the current staff target and version", async () => {
    const client = fixture();
    render(
      <MemoryRouter>
        <StaffLifecycle client={client} staffId="anna" />
      </MemoryRouter>
    );
    fireEvent.click(await screen.findByRole("button", { name: "Review departure" }));
    const checkbox = screen.getByRole("checkbox", { name: /Also disable/ });
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole("button", { name: "Confirm departure" }));
    await waitFor(() =>
      expect(client.lifecycleCommand).toHaveBeenCalledWith(
        "anna",
        "offboard",
        { version: 1, disableWorkspaceAccess: true },
        expect.any(String)
      )
    );
  });
  it("does not offer workspace disablement to a profile manager without workspace authority", async () => {
    const client = fixture();
    vi.mocked(client.lifecycle).mockResolvedValue({
      ...lifecycle,
      access: { ...lifecycle.access, canDisable: false },
    });
    render(
      <MemoryRouter>
        <StaffLifecycle client={client} staffId="anna" />
      </MemoryRouter>
    );
    fireEvent.click(await screen.findByRole("button", { name: "Review departure" }));
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm departure" }));
    await waitFor(() =>
      expect(client.lifecycleCommand).toHaveBeenCalledWith(
        "anna",
        "offboard",
        { version: 1, disableWorkspaceAccess: false },
        expect.any(String)
      )
    );
  });
});
