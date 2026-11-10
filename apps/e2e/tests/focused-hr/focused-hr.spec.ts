import { test, expect } from "@playwright/test";
import { hrTransport } from "./hr-fixture";
test("reuses directory records with scoped links and no unrelated app navigation", async ({
  page,
  context,
}, info) => {
  const fixture = await hrTransport(context);
  await page.goto("/?workspaceId=workspace-a");
  await expect(page.getByRole("heading", { name: "Team directory" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Anna Example" })).toHaveAttribute(
    "href",
    "/people/staff/anna?workspaceId=workspace-a"
  );
  await page.screenshot({ path: info.outputPath("hr-directory-desktop.png") });
  await page.getByRole("link", { name: "Anna Example" }).click();
  await expect(page.getByRole("heading", { name: "Anna Example" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Anna Example" })).toBeVisible();
  expect(fixture.requests.some((p) => /private|absences|availability/.test(p))).toBe(false);
  await expect(
    page.locator('aside a[href*="invoices"], aside a[href*="tasks"], aside a[href*="accounting"]')
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("banner")).toBeInViewport();
  await page.screenshot({ path: info.outputPath("hr-profile-mobile.png") });
});
test("manager edits the same staff record through session transport", async ({ page, context }) => {
  const fixture = await hrTransport(context, { manager: true });
  await context.addInitScript(() => {
    localStorage.setItem("accessToken", "old");
    localStorage.setItem("corely-active-workspace", "workspace-b");
  });
  await page.goto("/people/staff/anna/edit?workspaceId=workspace-a");
  await page.getByLabel("Display name", { exact: true }).fill("Anna Updated");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page).toHaveURL(/\/people\/staff\/anna\?workspaceId=workspace-a/);
  await expect(page.getByRole("heading", { name: "Anna Updated" })).toBeVisible();
  expect(fixture.commands).toHaveLength(1);
  expect(fixture.commands[0].headers).toMatchObject({
    "x-workspace-id": "workspace-a",
    "x-tenant-id": "tenant-a",
  });
  expect(fixture.commands[0].headers["x-csrf-token"]).toBeTruthy();
  expect(fixture.commands[0].headers["x-idempotency-key"]).toBeTruthy();
  expect(fixture.commands[0].headers.authorization).toBeUndefined();
});
test("staff self-service updates only own supported fields", async ({ page, context }, info) => {
  const fixture = await hrTransport(context);
  await page.goto("/people/me?workspaceId=workspace-a");
  await page.getByRole("button", { name: "Edit your details" }).click();
  await page.getByLabel("Display name", { exact: true }).fill("Anna Self");
  await page.getByRole("button", { name: "Save your details" }).click();
  await expect(page.getByText("Anna Self", { exact: true })).toBeVisible();
  expect(fixture.commands[0].path).toBe("/api/bff/people/me");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath("hr-self-mobile.png") });
});
test("denied directory does not fetch personnel records", async ({ page, context }, info) => {
  const fixture = await hrTransport(context, { denied: true });
  await page.goto("/people/staff?workspaceId=workspace-a");
  await expect(page.getByRole("alert")).toContainText("access");
  expect(fixture.requests.some((p) => p.startsWith("/api/bff/people"))).toBe(false);
  await page.screenshot({ path: info.outputPath("hr-denied.png") });
});
test("empty, error, unknown route and invalid workspace stay explicit", async ({
  page,
  context,
}) => {
  const options = { empty: true, fail: false };
  await hrTransport(context, options);
  await page.goto("/people/staff?workspaceId=workspace-a");
  await expect(page.getByText("No staff found", { exact: true })).toBeVisible();
  options.fail = true;
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("Unable to load staff");
  options.fail = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByText("No staff found", { exact: true })).toBeVisible();
  await page.goto("/invoices?workspaceId=workspace-a");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await page.goto("/people/staff?workspaceId=missing");
  await expect(page.getByRole("heading", { name: "Team directory" })).toHaveCount(0);
});

for (const failure of ["503", "network"] as const) {
  test(`retains a new profile and its retry key after a recoverable ${failure} failure`, async ({
    page,
    context,
  }, info) => {
    await hrTransport(context, { manager: true });
    const keys: string[] = [];
    const committed = new Set<string>();
    await context.route("**/api/bff/people/staff", async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }
      const key = (await route.request().allHeaders())["x-idempotency-key"] ?? "";
      expect(key).toBeTruthy();
      keys.push(key);
      // The server committed the first command, but the client did not receive its result.
      committed.add(key);
      if (keys.length === 1) {
        if (failure === "network") {
          await route.abort("failed");
        } else {
          await route.fulfill({ status: 503, json: {} });
        }
        return;
      }
      await route.fallback();
    });
    await page.goto("/people/staff/new?workspaceId=workspace-a");
    await page.getByLabel("Display name", { exact: true }).fill("Synthetic retry colleague");
    await page.getByRole("button", { name: "Save profile", exact: true }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("alert")).toContainText("save result could not be confirmed");
    await expect(page.getByRole("button", { name: "Reload profile", exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Display name", { exact: true })).toHaveValue(
      "Synthetic retry colleague"
    );
    if (failure === "503") {
      await page.screenshot({ path: info.outputPath("hr-recoverable-save.png") });
    }
    await page.getByRole("button", { name: "Save profile", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Synthetic retry colleague" })).toBeVisible();
    expect(keys).toHaveLength(2);
    expect(keys[1]).toBe(keys[0]);
    expect(committed.size).toBe(1);
  });
}

for (const status of [401, 403]) {
  test(`withdraws the HR form after a ${status} save denial`, async ({ page, context }) => {
    await hrTransport(context, { manager: true });
    await context.route("**/api/bff/people/staff", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ status, json: {} });
      } else {
        await route.fallback();
      }
    });
    await page.goto("/people/staff/new?workspaceId=workspace-a");
    await page.getByLabel("Display name", { exact: true }).fill("Synthetic denied colleague");
    await page.getByRole("button", { name: "Save profile", exact: true }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByLabel("Display name", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Save profile", exact: true })).toHaveCount(0);
  });
}

test("keeps a dirty HR edit until the user confirms navigation", async ({ page, context }) => {
  const fixture = await hrTransport(context, { manager: true });
  await page.goto("/people/staff/anna/edit?workspaceId=workspace-a");
  await page.getByLabel("Display name", { exact: true }).fill("Unsaved staff");
  await page.getByRole("link", { name: /Back to directory/ }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Stay", exact: true }).click();
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue("Unsaved staff");
  expect(fixture.commands).toHaveLength(0);
});
