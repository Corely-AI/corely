import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppCatalogItem } from "@corely/contracts";
import { AppSwitcher } from "./app-switcher";

afterEach(cleanup);
const hr: AppCatalogItem = {
  appId: "people",
  name: "People",
  tier: 1,
  version: "1",
  dependencies: [],
  enabled: true,
  launch: {
    launchId: "hr",
    surfaceId: "platform",
    category: "people",
    iconKey: "Users",
    availability: "available",
    url: "https://hr.app.corely.one/",
    displayName: { en: "HR", de: "Personal", vi: "Nhân sự" },
  },
};
describe("app switcher", () => {
  it("launches an available destination using the keyboard and restores focus on Escape", async () => {
    const onLaunch = vi.fn();
    const user = userEvent.setup();
    render(
      <AppSwitcher
        app="invoice"
        workspaceId="studio"
        apps={[hr]}
        onLaunch={onLaunch}
        onRetry={() => {}}
      />
    );
    await user.tab();
    await user.keyboard("{Enter}{ArrowDown}{Enter}");
    expect(onLaunch).toHaveBeenCalledWith("hr");
  });
  it("explains unavailable entries without making them launch actions", async () => {
    const launch = hr.launch;
    if (!launch) {
      throw new Error("Missing launch fixture");
    }
    const onLaunch = vi.fn();
    const user = userEvent.setup();
    render(
      <AppSwitcher
        app="invoice"
        workspaceId="studio"
        apps={[{ ...hr, launch: { ...launch, availability: "coming-soon", url: undefined } }]}
        onLaunch={onLaunch}
        onRetry={() => {}}
      />
    );
    await user.click(screen.getByRole("button", { name: "Switch apps" }));
    expect(screen.getByRole("menuitem")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("menuitem")).toHaveTextContent("Coming soon");
    await user.keyboard("{ArrowDown}{Enter}{Escape}");
    expect(onLaunch).not.toHaveBeenCalled();
  });
});
