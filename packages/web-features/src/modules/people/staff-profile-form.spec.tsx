import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { HttpError } from "@corely/api-client";
import { StaffProfileForm } from "./staff-profile-form";
import { peopleCopy } from "./people-copy";
const fixture = vi.hoisted(() => ({ command: vi.fn() }));
vi.mock("./people-api", () => ({ peopleApi: { command: fixture.command } }));
describe("Correcting staff link conflicts", () => {
  it("preserves the draft and permits correcting a duplicate identity link", async () => {
    fixture.command.mockReset();
    fixture.command.mockResolvedValue({ id: "created" });
    fixture.command.mockRejectedValueOnce(
      new HttpError("Conflict", 409, {
        code: "People:IdentityLinkConflict",
        message: "Identity link is already assigned to another staff profile",
      })
    );
    render(
      <MemoryRouter>
        <StaffProfileForm copy={peopleCopy.en} onReload={vi.fn()} />
      </MemoryRouter>
    );
    const name = screen.getByLabelText("Display name", { exact: true });
    fireEvent.change(name, { target: { value: "Anna" } });
    fireEvent.change(screen.getByLabelText("Login account ID"), {
      target: { value: "duplicate-account" },
    });
    const form = name.closest("form");
    if (!form) {
      throw new Error("Missing staff form");
    }
    fireEvent.submit(form);
    await screen.findByRole("alert");
    expect(name).toHaveValue("Anna");
    expect(name).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Reload profile" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Login account ID")).toBeEnabled();
    expect(screen.getByRole("button", { name: "Save profile", exact: true })).toBeEnabled();
    fireEvent.change(screen.getByLabelText("Login account ID"), {
      target: { value: "corrected-account" },
    });
    fireEvent.submit(form);
    await waitFor(() => expect(fixture.command).toHaveBeenCalledTimes(2));
    expect(fixture.command.mock.calls[1][2]).toMatchObject({
      displayName: "Anna",
      accountId: "corrected-account",
    });
    expect(fixture.command.mock.calls[1][3]).not.toBe(fixture.command.mock.calls[0][3]);
  });
  it("keeps stale-version conflicts blocked until the user reloads", async () => {
    fixture.command.mockReset();
    fixture.command.mockRejectedValue(new HttpError("Conflict", 409, { code: "Common:Http409" }));
    const reload = vi.fn();
    render(
      <MemoryRouter>
        <StaffProfileForm copy={peopleCopy.en} onReload={reload} />
      </MemoryRouter>
    );
    const name = screen.getByLabelText("Display name", { exact: true });
    fireEvent.change(name, { target: { value: "Anna" } });
    const form = name.closest("form");
    if (!form) {
      throw new Error("Missing staff form");
    }
    fireEvent.submit(form);
    await screen.findByRole("alert");
    expect(name).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Reload profile" }));
    expect(reload).toHaveBeenCalledOnce();
  });
});
