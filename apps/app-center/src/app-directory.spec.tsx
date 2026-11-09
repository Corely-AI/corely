import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { AppCatalogItem, AppCatalogLaunch } from "@corely/contracts";
import { AppDirectory, type AppDirectoryProps } from "./app-directory";

afterEach(cleanup);
const invoice: AppCatalogItem & { launch: AppCatalogLaunch } = {
  appId: "invoices",
  name: "Invoices",
  tier: 1,
  version: "1",
  dependencies: [],
  enabled: true,
  launch: {
    launchId: "invoice",
    surfaceId: "platform",
    displayName: { en: "Invoice", de: "Rechnungen", vi: "Hóa đơn" },
    category: "finance",
    iconKey: "file",
    availability: "available",
    url: "https://invoice.app.corely.one/",
  },
};
const hr: AppCatalogItem = {
  ...invoice,
  appId: "people",
  launch: {
    ...invoice.launch,
    launchId: "hr",
    displayName: { en: "HR", de: "Personal", vi: "Nhân sự" },
    category: "people",
    availability: "coming-soon",
    url: undefined,
  },
};
function setup(overrides: Partial<AppDirectoryProps> = {}) {
  const props: AppDirectoryProps = {
    apps: [invoice, hr],
    workspaceId: "workspace-one",
    locale: "en",
    loading: false,
    error: false,
    launching: false,
    launchError: false,
    onLaunch: vi.fn(),
    onRetry: vi.fn(),
    ...overrides,
  };
  render(<AppDirectory {...props} />);
  return props;
}
describe("workspace app directory", () => {
  it("groups supported destinations and excludes catalog records without a surface", () => {
    setup({
      apps: [
        invoice,
        hr,
        { ...invoice, appId: "planned", name: "Secret planned app", launch: undefined },
      ],
    });
    expect(screen.getByRole("heading", { name: "Finance" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "People" })).toBeTruthy();
    expect(screen.queryByText("Secret planned app")).toBeNull();
  });
  it("launches accessible Invoice and keeps unreleased HR disabled", () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "Open: Invoice" }));
    expect(props.onLaunch).toHaveBeenCalledWith("invoice");
    expect(
      (screen.getByRole("button", { name: "Coming soon: HR" }) as HTMLButtonElement).disabled
    ).toBe(true);
  });
  it("filters by localized name and category and reports no matches", () => {
    setup({ locale: "de" });
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "RECH" } });
    expect(screen.getByRole("heading", { name: "Rechnungen" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Personal", level: 3 })).toBeNull();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "people" } });
    expect(screen.getByRole("status").textContent).toContain("Keine Apps entsprechen");
  });
  it.each([
    { loading: true, expected: "Loading apps…" },
    { apps: [], expected: "No apps available for this workspace." },
  ])("renders a distinct loading/empty state", ({ expected, ...props }) => {
    setup(props);
    expect(screen.getByRole("status").textContent).toBe(expected);
    expect(screen.queryByRole("button", { name: "Open: Invoice" })).toBeNull();
  });
  it("hides stale catalog data on errors and supports retry", () => {
    const props = setup({ error: true });
    expect(screen.getByRole("alert").textContent).toContain("Apps could not be loaded");
    expect(screen.queryByRole("button", { name: "Open: Invoice" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(props.onRetry).toHaveBeenCalledOnce();
  });
  it.each(["app-disabled", "unconfigured"] as const)(
    "keeps %s destinations non-launchable",
    (availability) => {
      setup({
        apps: [
          {
            ...invoice,
            enabled: availability !== "app-disabled",
            launch: { ...invoice.launch, availability, url: undefined },
          },
        ],
      });
      const button = screen.getByRole("button");
      expect((button as HTMLButtonElement).disabled).toBe(true);
      expect(button.textContent).toBe(
        availability === "app-disabled" ? "Not enabled" : "Unavailable"
      );
    }
  );
  it("rejects malformed destinations and shows launch revalidation failures", () => {
    setup({
      apps: [
        {
          ...invoice,
          launch: { ...invoice.launch, url: "https://evil.invalid/path?token=secret" },
        },
      ],
      launchError: true,
    });
    expect(
      (screen.getByRole("button", { name: "Unavailable: Invoice" }) as HTMLButtonElement).disabled
    ).toBe(true);
    expect(screen.getByRole("alert").textContent).toContain("no longer available");
  });
  it("blocks repeated launches while checking access", () => {
    setup({ launching: true });
    expect(
      (screen.getByRole("button", { name: "Open: Invoice" }) as HTMLButtonElement).disabled
    ).toBe(true);
    expect(screen.getByRole("status").textContent).toBe("Checking access…");
  });
});
