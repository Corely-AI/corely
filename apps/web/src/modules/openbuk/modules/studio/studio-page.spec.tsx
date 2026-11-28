import React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "@corely/api-client";
import type { OperationalExperience } from "@corely/contracts";
import { LanguageProvider } from "../../shared/i18n";
import StudioPage from "./studio-page";

const request = vi.hoisted(() => vi.fn());
vi.mock("../../shared/api", () => ({
  api: { request },
  auth: { loadStoredTokens: vi.fn(), getAccessToken: () => "synthetic-token" },
  storage: {
    getActiveWorkspaceId: async () => "studio-a",
    setActiveWorkspaceId: vi.fn(),
  },
}));
vi.mock("@corely/web-features/modules/people/self-service", () => ({
  createStaffJourneyClient: vi.fn(),
  StaffSelfService: () => <h1>Staff profile</h1>,
}));
vi.mock("@corely/web-features/modules/tasks", () => ({
  createTasksClient: vi.fn(),
  createChecklistsClient: vi.fn(),
  RecurringChecklists: () => <h1>Checklist templates</h1>,
  DailyWork: () => <h1>Employee tasks</h1>,
}));
vi.mock("../../../tasks/task-creation-guidance", () => ({
  getTaskCreationGuidance: vi.fn(),
}));

const workspace = {
  id: "studio-a",
  name: "Synthetic Salon",
  publicEnabled: true,
  publicModules: { booking: true },
};
const configurationPath = "/workspaces/studio-a/config?scope=web&packageId=internal-operations";
const experiences: OperationalExperience[] = [
  {
    id: "schedule",
    label: "Schedule",
    availability: { status: "available", route: "/openbuk/app" },
  },
  { id: "team", label: "Team", availability: { status: "available", route: "/app/me" } },
  {
    id: "daily-work",
    label: "Daily Work",
    availability: { status: "available", route: "/app/tasks" },
  },
  {
    id: "decisions",
    label: "Decisions",
    availability: { status: "unavailable", reason: "not-implemented" },
  },
  {
    id: "knowledge",
    label: "Knowledge",
    availability: { status: "unavailable", reason: "permission-denied" },
  },
];

function configuration(entries = experiences, workspaceId = workspace.id) {
  return {
    workspaceId,
    operationalPackage: {
      packageId: "internal-operations",
      client: "openbuk-web",
      experiences: entries,
    },
    currentUser: { isWorkspaceAdmin: false },
  };
}

function RoutingProbe() {
  const { pathname, search } = useLocation();
  return <span>{pathname + search}</span>;
}

function renderStudio(path: string, getPackage: () => unknown) {
  request.mockImplementation(async (endpoint: string) => {
    if (endpoint === "/workspaces") {
      return { workspaces: [workspace] };
    }
    if (endpoint === configurationPath) {
      return getPackage();
    }
    throw new Error("Unexpected request " + endpoint);
  });
  return render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <LanguageProvider>
        <StudioPage embedded />
      </LanguageProvider>
      <RoutingProbe />
    </MemoryRouter>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  request.mockReset();
  localStorage.clear();
});

describe("OpenBuk operational shell", () => {
  it("uses approved links, keeps deep links and opens manual views without a Booking or AI call", async () => {
    const staffExperiences = experiences.map(
      (entry): OperationalExperience =>
        entry.id === "schedule"
          ? { ...entry, availability: { status: "unavailable", reason: "permission-denied" } }
          : entry
    );
    renderStudio("/openbuk/app/tasks/templates", () => configuration(staffExperiences));

    expect(await screen.findByRole("heading", { name: "Checklist templates" })).toBeVisible();
    const nav = within(screen.getByRole("navigation", { name: "Studio navigation" }));
    expect(nav.getByRole("link", { name: "Daily Work" })).toHaveAttribute("aria-current", "page");
    expect(nav.getByRole("link", { name: "Team" })).toHaveAttribute("href", "/openbuk/app/me");
    expect(nav.queryByRole("link", { name: /schedule|decisions|knowledge|settings/i })).toBeNull();
    fireEvent.click(nav.getByRole("link", { name: "Team" }));
    expect(await screen.findByRole("heading", { name: "Staff profile" })).toBeVisible();
    expect(request.mock.calls.map(([path]) => path)).toEqual(["/workspaces", configurationPath]);
    expect(request).toHaveBeenCalledWith(
      configurationPath,
      { headers: { "X-Workspace-Id": "studio-a" } },
      { workspaceScope: "none", signal: expect.any(AbortSignal) }
    );
  });

  it("hands off only to the known owner route with the verified workspace and locale", async () => {
    renderStudio("/openbuk/app/knowledge?token=ignore", () =>
      configuration(
        experiences.map(
          (entry): OperationalExperience =>
            entry.id === "knowledge"
              ? { ...entry, availability: { status: "available", route: "/knowledge" } }
              : entry
        )
      )
    );
    expect(await screen.findByText("/knowledge?workspaceId=studio-a&lang=en")).toBeVisible();
  });

  it("does not follow a mismatched destination from the package descriptor", async () => {
    renderStudio("/openbuk/app/knowledge", () =>
      configuration(
        experiences.map(
          (entry): OperationalExperience =>
            entry.id === "knowledge"
              ? { ...entry, availability: { status: "available", route: "//example.invalid" } }
              : entry
        )
      )
    );
    expect(await screen.findByRole("heading", { name: "Section unavailable" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Knowledge" })).toBeNull();
  });

  it("does not mount a manually entered route when metadata denies access", async () => {
    renderStudio("/openbuk/app/tasks", () =>
      configuration(experiences.filter((entry) => entry.id !== "daily-work"))
    );
    expect(await screen.findByRole("heading", { name: "Section unavailable" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Employee tasks" })).toBeNull();
  });

  it("rejects a configuration for another workspace and supports retry", async () => {
    let attempts = 0;
    renderStudio("/openbuk/app/tasks", () =>
      configuration(experiences, attempts++ === 0 ? "other-studio" : workspace.id)
    );
    expect(await screen.findByRole("alert")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Employee tasks" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Employee tasks" })).toBeVisible();
  });

  it("treats a revoked membership as unavailable", async () => {
    renderStudio("/openbuk/app/me", () => {
      throw new HttpError("Denied", 403);
    });
    expect(await screen.findByRole("heading", { name: "Section unavailable" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Team" })).toBeNull();
  });

  it("signals offline status without replacing the selected workflow", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    renderStudio("/openbuk/app/tasks", () => configuration());
    expect(await screen.findByRole("heading", { name: "Employee tasks" })).toBeVisible();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    await act(async () => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByRole("status")).toHaveTextContent("You’re offline");
    expect(screen.getByRole("heading", { name: "Employee tasks" })).toBeVisible();
  });
});
