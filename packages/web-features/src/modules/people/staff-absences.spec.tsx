import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StaffAbsence } from "@corely/contracts";
import type * as PeopleHooks from "./use-people";
import { peopleCopy } from "./people-copy";
import { StaffAbsences } from "./staff-absences";
const fixture = vi.hoisted(() => ({
  load: vi.fn(),
  command: vi.fn(),
  files: vi.fn(),
  upload: vi.fn(),
  download: vi.fn(),
  scope: "workspace-a",
  privateRead: true,
  manage: true,
  documents: false,
}));
vi.mock("./people-api", () => ({
  peopleApi: {
    absences: fixture.load,
    absenceCommand: fixture.command,
    absenceAttachments: fixture.files,
    uploadAbsenceAttachment: fixture.upload,
    downloadAbsenceAttachment: fixture.download,
  },
}));
vi.mock("./use-people", async (original) => ({
  ...(await original<typeof PeopleHooks>()),
  usePeopleAccess: () => ({
    scope: fixture.scope,
    locale: "en",
    loading: false,
    copy: peopleCopy.en,
    can: (key: string) =>
      key === "private.read"
        ? fixture.privateRead
        : key === "documents.read"
          ? fixture.documents
          : fixture.manage,
  }),
}));
const record = (): StaffAbsence => ({
  id: "absence-a",
  staffId: "staff-a",
  workspaceId: "workspace-a",
  revisions: [
    {
      version: 1,
      status: "approved",
      range: {
        kind: "full-day",
        timezone: "Europe/Berlin",
        startDate: "2030-01-07",
        endDate: "2030-01-08",
      },
      startAt: "2030-01-06T23:00:00.000Z",
      endAt: "2030-01-07T23:00:00.000Z",
      reason: "Synthetic private value",
      notes: null,
      changedAt: "2026-11-08T12:00:00.000Z",
      changedBy: "manager",
    },
  ],
});
const tree = (saved = vi.fn()) => (
  <MemoryRouter>
    <StaffAbsences id="staff-a" archived={false} onSaved={saved} />
  </MemoryRouter>
);
beforeEach(() => {
  vi.resetAllMocks();
  fixture.scope = "workspace-a";
  fixture.privateRead = true;
  fixture.manage = true;
  fixture.documents = false;
  fixture.load.mockResolvedValue({ items: [] });
  fixture.files.mockResolvedValue({ items: [] });
});
async function fillForm() {
  await screen.findByText("No absences recorded");
  fireEvent.click(screen.getByRole("button", { name: "Record approved absence" }));
  fireEvent.change(screen.getByLabelText("First absent date"), { target: { value: "2030-01-07" } });
  fireEvent.change(screen.getByLabelText("Return date (exclusive)"), {
    target: { value: "2030-01-08" },
  });
  fireEvent.change(screen.getByLabelText("Absence timezone"), {
    target: { value: "Europe/Berlin" },
  });
  fireEvent.change(screen.getByLabelText("Private reason"), {
    target: { value: "Synthetic private value" },
  });
}
describe("Private absence manager flow", () => {
  it("does not retrieve absence data or files without private read permission", () => {
    fixture.privateRead = false;
    fixture.documents = true;
    render(tree());
    expect(screen.queryByRole("heading", { name: "Private absences" })).not.toBeInTheDocument();
    expect(fixture.load).not.toHaveBeenCalled();
    expect(fixture.files).not.toHaveBeenCalled();
  });
  it("submits exclusive full-day dates, preserves failed drafts and reuses the command key", async () => {
    const saved = vi.fn();
    fixture.command
      .mockRejectedValueOnce(new Error("Lost response"))
      .mockResolvedValueOnce(record());
    render(tree(saved));
    await fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Save approved absence" }));
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Private reason")).toHaveValue("Synthetic private value");
    fireEvent.click(screen.getByRole("button", { name: "Save approved absence" }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(fixture.command.mock.calls[0][3]).toMatchObject({
      range: {
        kind: "full-day",
        timezone: "Europe/Berlin",
        startDate: "2030-01-07",
        endDate: "2030-01-08",
      },
      reason: "Synthetic private value",
    });
    expect(fixture.command.mock.calls[0][4]).toBe(fixture.command.mock.calls[1][4]);
  });
  it("corrects partial UTC instants with the observed version and confirms cancellation", async () => {
    fixture.load.mockResolvedValue({ items: [record()] });
    fixture.command.mockResolvedValue(record());
    render(tree());
    await screen.findByText("Synthetic private value");
    fireEvent.click(screen.getByRole("button", { name: "Correct absence" }));
    fireEvent.change(screen.getByLabelText("Range type"), { target: { value: "partial-day" } });
    fireEvent.change(screen.getByLabelText("Start (UTC)"), {
      target: { value: "2030-01-07T22:00" },
    });
    fireEvent.change(screen.getByLabelText("End (UTC)"), { target: { value: "2030-01-08T02:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Save correction" }));
    await waitFor(() => expect(fixture.command).toHaveBeenCalledOnce());
    expect(fixture.command.mock.calls[0]).toEqual([
      "staff-a",
      "absence-a",
      "correct",
      expect.objectContaining({
        version: 1,
        range: {
          kind: "partial-day",
          timezone: "Europe/Berlin",
          startAt: "2030-01-07T22:00:00.000Z",
          endAt: "2030-01-08T02:00:00.000Z",
        },
      }),
      expect.any(String),
    ]);
    await screen.findByRole("button", { name: "Cancel absence" });
    fireEvent.click(screen.getByRole("button", { name: "Cancel absence" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(fixture.command).toHaveBeenCalledTimes(1);
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel absence" }));
    await waitFor(() => expect(fixture.command).toHaveBeenCalledTimes(2));
    expect(fixture.command.mock.calls[1][3]).toEqual({ version: 1 });
  });
  it("clears private data and pending actions on workspace switching or revocation", async () => {
    let complete: (value: { items: StaffAbsence[] }) => void = () => {};
    fixture.load
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            complete = resolve;
          })
      )
      .mockResolvedValueOnce({ items: [] });
    const view = render(tree());
    fixture.scope = "workspace-b";
    view.rerender(tree());
    await screen.findByText("No absences recorded");
    await act(async () => complete({ items: [record()] }));
    expect(screen.queryByText("Synthetic private value")).not.toBeInTheDocument();
    await fillForm();
    fixture.privateRead = false;
    view.rerender(tree());
    expect(screen.queryByLabelText("Private reason")).not.toBeInTheDocument();
    expect(fixture.command).not.toHaveBeenCalled();
  });
  it("hides file metadata without the personnel document grant, even for private readers", async () => {
    fixture.load.mockResolvedValue({ items: [record()] });
    render(tree());
    await screen.findByText("Synthetic private value");
    expect(fixture.files).not.toHaveBeenCalled();
    expect(screen.queryByText("Private attachments")).not.toBeInTheDocument();
  });
  it("cannot trigger a file download from a late response after scope switching", async () => {
    fixture.documents = true;
    fixture.load.mockResolvedValue({ items: [record()] });
    fixture.files.mockResolvedValue({
      items: [
        {
          documentId: "personnel-example",
          filename: "example.txt",
          contentType: "text/plain",
          sizeBytes: 5,
          createdAt: "2026-11-08T12:00:00.000Z",
        },
      ],
    });
    let complete: (value: Blob) => void = () => {};
    fixture.download.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        })
    );
    const objectUrl = vi.fn();
    vi.stubGlobal(
      "URL",
      class extends URL {
        static createObjectURL = objectUrl;
      }
    );
    const view = render(tree());
    fireEvent.click(await screen.findByRole("button", { name: "Download" }));
    fixture.scope = "workspace-b";
    fixture.load.mockResolvedValue({ items: [] });
    view.rerender(tree());
    await act(async () => complete(new Blob(["private bytes"])));
    expect(objectUrl).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
