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
  await expect(page.getByRole("alert")).toContainText("temporarily unavailable");
  options.fail = false;
  await page.goto("/invoices?workspaceId=workspace-a");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await page.goto("/people/staff?workspaceId=missing");
  await expect(page.getByRole("heading", { name: "Team directory" })).toHaveCount(0);
});

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
