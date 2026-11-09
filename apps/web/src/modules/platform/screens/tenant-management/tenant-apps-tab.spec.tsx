import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TenantAppsTab } from "./TenantAppsTab";
const update = vi.hoisted(() => vi.fn());
vi.mock("@/lib/platform-entitlements-api", () => ({
  platformEntitlementsApi: { updateAppEnablement: update },
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const catalog = [
  { appId: "invoices", name: "Invoice", version: "1", tier: 1, dependencies: ["parties"] },
  { appId: "parties", name: "Customers", version: "1", tier: 1, dependencies: [] },
];
function setup(enabled = false, installed = true) {
  const refresh = vi.fn();
  render(
    <TenantAppsTab
      tenantId="tenant-a"
      catalog={catalog.map((app) => ({ ...app, enabled: installed }))}
      entitlements={catalog.map((app) => ({
        appId: app.appId,
        enabled,
        dependencies: app.dependencies,
        source: "default" as const,
      }))}
      onRefresh={refresh}
    />
  );
  return refresh;
}
describe("existing host app controls", () => {
  it("explains dependencies before enabling and confirms the audited change", async () => {
    update.mockResolvedValue({ success: true });
    const refresh = setup();
    fireEvent.click(screen.getByRole("button", { name: "Enable: Invoice" }));
    expect(screen.getByRole("alertdialog").textContent).toContain("Customers");
    expect(update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Enable with dependencies" }));
    await waitFor(() => expect(update).toHaveBeenCalledWith("tenant-a", "invoices", true));
    expect((await screen.findByRole("status")).textContent).toContain("audit log");
    expect(refresh).toHaveBeenCalledOnce();
  });
  it("explains dependent constraints without forcing a cascading disable", async () => {
    update.mockRejectedValue({ status: 409 });
    const refresh = setup(true);
    fireEvent.click(screen.getByRole("button", { name: "Disable: Customers" }));
    expect((await screen.findByRole("alert")).textContent).toContain("dependent apps");
    expect(update).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledWith("tenant-a", "parties", false);
    expect(refresh).toHaveBeenCalledOnce();
  });
  it("preserves explicit cascading disable with server-listed dependencies and confirmation", async () => {
    update
      .mockRejectedValueOnce({ status: 409, body: { dependents: ["invoices"] } })
      .mockResolvedValueOnce({ success: true });
    setup(true);
    fireEvent.click(screen.getByRole("button", { name: "Disable: Customers" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain("Invoice");
    expect(update).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Disable app and dependents" }));
    await waitFor(() =>
      expect(update).toHaveBeenLastCalledWith("tenant-a", "parties", false, true)
    );
    expect((await screen.findByRole("status")).textContent).toContain("audit log");
  });

  it("offers installation for a default-entitled app that has no active install", async () => {
    update.mockResolvedValue({ success: true });
    setup(true, false);
    fireEvent.click(screen.getByRole("button", { name: "Install: Invoice" }));
    fireEvent.click(screen.getByRole("button", { name: "Install with dependencies" }));
    await waitFor(() => expect(update).toHaveBeenCalledWith("tenant-a", "invoices", true));
  });
  it("shows revoked permission and refreshes instead of reporting success", async () => {
    update.mockRejectedValue({ status: 403 });
    setup(true);
    fireEvent.click(screen.getByRole("button", { name: "Disable: Invoice" }));
    expect((await screen.findByRole("alert")).textContent).toContain("no longer have permission");
    expect(screen.queryByRole("status")).toBeNull();
  });
});
