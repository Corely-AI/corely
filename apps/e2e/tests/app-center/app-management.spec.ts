import { test, expect, type BrowserContext } from "@playwright/test";
import {
  workspaceFixtureResponse,
  fixtureOrigins,
} from "../../../../packages/web-shared/testkit/workspace-api-fixture";
async function transport(context: BrowserContext, admin = false) {
  let enabled = true;
  await context.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname === "/api/bff/menu/app-management") {
      await route.fulfill({ json: admin ? { path: "/settings/tenants/tenant-a" } : {} });
      return;
    }
    const response = workspaceFixtureResponse(
      url.pathname + url.search,
      new Headers(await req.allHeaders()),
      "user-a",
      "app-center",
      fixtureOrigins("5193")
    );
    const body: unknown = await response.json();
    await route.fulfill({
      status: response.status,
      json: url.pathname === "/api/bff/menu/launches" && !enabled ? [] : body,
    });
  });
  return {
    disable: () => {
      enabled = false;
    },
  };
}
test("members cannot see management; periodic refresh withdraws revoked apps", async ({
  page,
  context,
}) => {
  const f = await transport(context);
  await page.clock.install();
  await page.goto("/?workspaceId=workspace-a");
  await expect(page.getByRole("button", { name: "Open: Invoice" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Manage team apps" })).toHaveCount(0);
  f.disable();
  await page.clock.fastForward(30_001);
  await expect(page.getByRole("button", { name: "Open: Invoice" })).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("No apps available");
});
test("eligible host admins see the retained configuration entry on desktop and phone", async ({
  page,
  context,
}) => {
  await transport(context, true);
  await page.goto("/?workspaceId=workspace-a");
  await expect(page.getByRole("button", { name: "Manage team apps" })).toBeVisible();
  await page.getByRole("button", { name: "Manage team apps" }).focus();
  await expect(page.getByRole("button", { name: "Manage team apps" })).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // The retained route is served by legacy hosting, separately gated by SURF-19.
  await page.route("**/settings/tenants/tenant-a", (route) =>
    route.fulfill({ contentType: "text/html", body: "<h1>Retained tenant administration</h1>" })
  );
  await page.getByRole("button", { name: "Manage team apps" }).click();
  await expect(page).toHaveURL(/\/settings\/tenants\/tenant-a$/);
});
test("a disabled app cannot launch from a stale directory", async ({ page, context }) => {
  const f = await transport(context);
  await page.goto("/?workspaceId=workspace-a");
  await expect(page.getByRole("button", { name: "Open: Invoice" })).toBeVisible();
  f.disable();
  await page.getByRole("button", { name: "Open: Invoice" }).click();
  await expect(page.getByRole("alert")).toContainText("no longer available");
  await expect(page).toHaveURL(/workspaceId=workspace-a/);
});
