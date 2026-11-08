import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { RecurringChecklists } from "./recurring-checklists";
import type { ChecklistsClient } from "./checklists-client";
import type { TasksClient } from "./tasks-client";
import type { ChecklistTemplateView } from "@corely/contracts";
const row: ChecklistTemplateView = {
  id: "35f708b5-cbda-4bc1-bcee-51506c9e6018",
  workspaceId: "workspace",
  timezone: "Europe/Berlin",
  version: 1,
  state: "ACTIVE",
  localToday: "2026-11-08",
  pauses: [],
  occurrences: [],
  createdAt: "2026-11-08T00:00:00Z",
  updatedAt: "2026-11-08T00:00:00Z",
  plans: [
    {
      version: 1,
      title: "Opening routine",
      effectiveFrom: "2026-11-08",
      effectiveUntil: null,
      weekdays: [1],
      dueTime: "09:00",
      assigneeIds: ["45f708b5-cbda-4bc1-bcee-51506c9e6018"],
      steps: [{ id: "55f708b5-cbda-4bc1-bcee-51506c9e6018", title: "Unlock" }],
    },
  ],
};
function setup(status: number, locale = "en") {
  const client: ChecklistsClient = {
    list: vi.fn(async () => ({ items: [row], total: 1, page: 1, pageSize: 10 })),
    command: vi.fn(async () => {
      throw { status };
    }),
  };
  const tasksClient: TasksClient = {
    list: vi.fn(),
    command: vi.fn(),
    assignees: vi.fn(async () => [{ id: row.plans[0].assigneeIds[0], displayName: "Anna" }]),
  };
  render(
    <MemoryRouter>
      <RecurringChecklists client={client} tasksClient={tasksClient} locale={locale} />
    </MemoryRouter>
  );
  return client;
}
describe("Checklist management", () => {
  it("keeps a new checklist draft while clearing, validating and retyping its timezone", async () => {
    const client = setup(500);
    fireEvent.click(await screen.findByRole("button", { name: "New checklist" }));
    fireEvent.change(screen.getByLabelText("Checklist title"), {
      target: { value: "Opening draft" },
    });
    fireEvent.change(screen.getByLabelText("Starts on"), { target: { value: "2026-11-15" } });
    fireEvent.change(screen.getByLabelText("Step 1"), { target: { value: "Unlock reception" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Anna" }));
    const timezone = screen.getByLabelText("Timezone");
    timezone.focus();
    for (const value of ["", "Asia", "Asia/", "Asia/Ho_"]) {
      fireEvent.change(timezone, { target: { value } });
      expect(screen.getByLabelText("Timezone")).toHaveValue(value);
      expect(timezone).toHaveFocus();
    }
    fireEvent.click(screen.getByRole("button", { name: "Publish checklist" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Check the title, timezone");
    expect(client.command).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Checklist title")).toHaveValue("Opening draft");
    expect(screen.getByLabelText("Starts on")).toHaveValue("2026-11-15");
    expect(screen.getByLabelText("Step 1")).toHaveValue("Unlock reception");
    expect(screen.getByRole("checkbox", { name: "Anna" })).toBeChecked();
    fireEvent.change(timezone, { target: { value: "Asia/Ho_Chi_Minh" } });
    fireEvent.click(screen.getByRole("button", { name: "Publish checklist" }));
    await waitFor(() => expect(client.command).toHaveBeenCalledTimes(1));
    expect(client.command).toHaveBeenCalledWith(
      "",
      expect.objectContaining({
        title: "Opening draft",
        timezone: "Asia/Ho_Chi_Minh",
        effectiveFrom: "2026-11-15",
        assigneeIds: row.plans[0].assigneeIds,
        steps: [expect.objectContaining({ title: "Unlock reception" })],
      }),
      expect.any(String)
    );
  });
  it("keeps a future edit and its retry key after an uncertain failure", async () => {
    const client = setup(500);
    fireEvent.click(await screen.findByRole("button", { name: "Edit future schedule" }));
    expect(screen.getByLabelText("Starts on")).toHaveValue("2026-11-09");
    expect(screen.getByLabelText("Timezone")).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Checklist title"), {
      target: { value: "Closing routine" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Publish changes" }));
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Checklist title")).toHaveValue("Closing routine");
    fireEvent.click(screen.getByRole("button", { name: "Publish changes" }));
    await waitFor(() => expect(client.command).toHaveBeenCalledTimes(2));
    const calls = vi.mocked(client.command).mock.calls;
    expect(calls[0][2]).toBe(calls[1][2]);
    expect(calls[0][1]).toMatchObject({
      version: 1,
      plan: { effectiveFrom: "2026-11-09", title: "Closing routine" },
    });
  });
  it.each([401, 403, 404])(
    "clears the old template and editor when access changes (%s)",
    async (status) => {
      setup(status);
      fireEvent.click(await screen.findByRole("button", { name: "Edit future schedule" }));
      fireEvent.click(screen.getByRole("button", { name: "Publish changes" }));
      await screen.findByRole("alert");
      expect(screen.queryByRole("article")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Checklist title")).not.toBeInTheDocument();
    }
  );
  it.each([
    ["de", "Wiederkehrende Checklisten"],
    ["vi", "Danh sách kiểm tra định kỳ"],
  ])("renders management copy in %s", async (locale, title) => {
    setup(500, locale);
    await screen.findByRole("article");
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
  });
});
