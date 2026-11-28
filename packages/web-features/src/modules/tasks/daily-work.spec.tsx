import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { EmployeeTask, EmployeeTaskList } from "@corely/contracts";
import { MemoryRouter } from "react-router-dom";
import { DailyWork } from "./daily-work";
import type { TasksClient } from "./tasks-client";

const task: EmployeeTask = {
  id: "35f708b5-cbda-4bc1-bcee-51506c9e6018",
  workspaceId: "workspace",
  title: "Restricted team work",
  ownerStaffId: "45f708b5-cbda-4bc1-bcee-51506c9e6018",
  ownerName: "Anna",
  ownerArchived: false,
  status: "OPEN",
  dueAt: null,
  version: 1,
  createdAt: "2026-11-08T00:00:00Z",
  updatedAt: "2026-11-08T00:00:00Z",
  completedAt: null,
};
function fixture(status: number) {
  const result: EmployeeTaskList = {
    items: [task],
    total: 1,
    page: 1,
    pageSize: 20,
    capabilities: { manage: true, completeOwn: true },
  };
  const client: TasksClient = {
    list: vi.fn(async () => result),
    assignees: vi.fn(async () => [{ id: task.ownerStaffId, displayName: "Anna" }]),
    command: vi.fn(async () => {
      throw { status };
    }),
  };
  return client;
}
describe("Daily Work current access after a denied mutation", () => {
  it.each([401, 403, 404])(
    "discards the previous task projection and editor after HTTP %s",
    async (status) => {
      const client = fixture(status);
      render(
        <MemoryRouter>
          <DailyWork client={client} />
        </MemoryRouter>
      );
      fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
      fireEvent.change(screen.getByLabelText("Task title"), { target: { value: "Local edit" } });
      fireEvent.click(screen.getByRole("button", { name: "Save task" }));
      await screen.findByRole("alert");
      await waitFor(() => expect(screen.queryByRole("article")).not.toBeInTheDocument());
      expect(screen.queryByLabelText("Task title")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "New task" })).not.toBeInTheDocument();
      const list = vi.mocked(client.list);
      list.mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        capabilities: { manage: false, completeOwn: false },
      });
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      await screen.findByRole("heading", { name: "No tasks here yet" });
      expect(screen.queryByRole("button", { name: "New task" })).not.toBeInTheDocument();
    }
  );
  it.each([409, 500])(
    "keeps local edits available for conflict/network recovery after HTTP %s",
    async (status) => {
      render(
        <MemoryRouter>
          <DailyWork client={fixture(status)} />
        </MemoryRouter>
      );
      fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
      fireEvent.change(screen.getByLabelText("Task title"), {
        target: { value: "Keep this draft" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Save task" }));
      await screen.findByRole("alert");
      expect(screen.getByLabelText("Task title")).toHaveValue("Keep this draft");
      expect(screen.getByRole("article")).toBeInTheDocument();
    }
  );
});

describe("Checklist progress in Daily Work", () => {
  it("requires every step before completion and updates progress without remounting the focused checkbox", async () => {
    const client = fixture(500);
    const checklist = [
      { id: "55f708b5-cbda-4bc1-bcee-51506c9e6018", title: "Unlock reception", completed: false },
    ];
    vi.mocked(client.list).mockResolvedValue({
      items: [{ ...task, checklist }],
      total: 1,
      page: 1,
      pageSize: 20,
      capabilities: { manage: false, completeOwn: true },
    });
    vi.mocked(client.command).mockResolvedValue({
      ...task,
      version: 2,
      checklist: [{ ...checklist[0], completed: true }],
    });
    render(
      <MemoryRouter>
        <DailyWork client={client} />
      </MemoryRouter>
    );
    const checkbox = await screen.findByRole("checkbox", { name: "Unlock reception" });
    expect(screen.getByRole("button", { name: "Complete" })).toBeDisabled();
    checkbox.focus();
    fireEvent.click(checkbox);
    await waitFor(() => expect(checkbox).toBeChecked());
    expect(checkbox).toHaveFocus();
    expect(client.command).toHaveBeenCalledWith(
      `/${task.id}/checklist/${checklist[0].id}`,
      "POST",
      { version: 1, completed: true },
      expect.any(String)
    );
    expect(screen.getByRole("button", { name: "Complete" })).toBeEnabled();
    expect(client.list).toHaveBeenCalledTimes(1);
  });
});
