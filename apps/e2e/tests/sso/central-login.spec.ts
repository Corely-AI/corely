import { test, expect, type Page } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const directory = process.env.SSO_TEST_OUTPUT_DIR;
if (!directory?.startsWith("/private/tmp/"))
  throw new Error("Start the disposable SSO test server and set SSO_TEST_OUTPUT_DIR");
const fixture: {
  email: string;
  origins: { app: string; login: string; invoice: string; hr: string };
} = JSON.parse(readFileSync(`${directory}/fixture.json`, "utf8"));
for (const origin of Object.values(fixture.origins))
  if (!/^https:\/\/(?:[\w-]+\.)+corely\.test:8444$/.test(origin))
    throw new Error("Refusing non-local SSO browser target");
const evidence = resolve(import.meta.dirname, "../../../../docs/tasks/384-assets");
async function screenshot(page: Page, name: string) {
  if (process.env.SSO_CAPTURE_EVIDENCE === "true") {
    mkdirSync(evidence, { recursive: true });
    await page.screenshot({ path: `${evidence}/${name}.png`, fullPage: true });
  }
}
async function openLogin(page: Page, origin = fixture.origins.app) {
  await page.goto(origin);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByLabel("Email address")).toBeVisible();
}
test("fresh login and a second app reuse the same central account", async ({ page, context }) => {
  await openLogin(page);
  await screenshot(page, "login-desktop");
  await page.getByRole("button", { name: "Use a password instead" }).click();
  await page.getByLabel("Email address").fill(fixture.email);
  await page.getByLabel("Password", { exact: true }).fill("Synthetic-SSO-384!");
  await page.getByRole("button", { name: "Sign in and continue" }).click();
  await expect(page.getByRole("heading", { name: "Signed in to app-center" })).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  const second = await context.newPage();
  await second.goto(fixture.origins.invoice);
  await second.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(second.getByRole("heading", { name: "Signed in to invoice" })).toBeVisible();
  const cookies = await context.cookies();
  const central = cookies.find((cookie) => cookie.name === "__Host-corely-login")!;
  expect(central.domain).toBe("login.corely.test");
  expect(central.httpOnly).toBe(true);
  expect(central.secure).toBe(true);
  expect(cookies.filter((cookie) => cookie.name === "__Host-corely-session")).toHaveLength(2);
});
test("bad credentials remain recoverable and error receives keyboard focus", async ({ page }) => {
  await openLogin(page);
  await page.getByRole("button", { name: "Use a password instead" }).click();
  await page.getByLabel("Email address").fill(fixture.email);
  await page.getByLabel("Password", { exact: true }).fill("Wrong-synthetic-password");
  await page.getByRole("button", { name: "Sign in and continue" }).click();
  await expect(page.getByRole("alert")).toContainText("Check your email and password");
  await expect(page.getByRole("alert")).toBeFocused();
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  await expect(page.getByRole("link", { name: "Forgot your password?" })).toHaveAttribute(
    "href",
    `${fixture.origins.app}/auth/forgot-password`
  );
  await screenshot(page, "login-error");
});
test("mobile layout and German/Vietnamese labels have no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openLogin(page);
  await page.getByLabel("Language").selectOption("de");
  await expect(page.getByLabel("E-Mail-Adresse")).toBeVisible();
  await screenshot(page, "login-mobile-de");
  await page.getByLabel("Sprache").selectOption("vi");
  await expect(page.getByLabel("Địa chỉ email")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  );
  await screenshot(page, "login-mobile-vi");
});
test("cancellation and invalid/expired requests never loop or show a blank page", async ({
  page,
}) => {
  await openLogin(page);
  await page.getByRole("button", { name: "Cancel sign-in" }).click();
  await expect(page.getByRole("heading", { name: "Sign-in cancelled" })).toBeVisible();
  await page.goto(`${fixture.origins.login}/login?request=${"a".repeat(43)}`);
  await expect(page.getByRole("alert")).toContainText("expired");
  await screenshot(page, "login-expired");
  await expect(page.getByLabel("Password", { exact: true })).toHaveCount(0);
});
test("issuer unavailability offers retry without discarding the request", async ({ page }) => {
  await page.route("**/sso/context?*", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "synthetic unavailable" }),
    })
  );
  await page.goto(`${fixture.origins.login}/login?request=${"b".repeat(43)}`);
  await expect(page.getByRole("alert")).toContainText("temporarily unavailable");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("passwordless email code creates the same SSO session without a password", async ({
  page,
  context,
}) => {
  await openLogin(page);
  await page.getByLabel("Email address").fill(fixture.email);
  await page.getByRole("button", { name: "Email me a sign-in code" }).click();
  await expect(page.getByLabel("Sign-in code", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Sign-in code", { exact: true })).toBeFocused();
  await expect(page.getByRole("button", { name: /Resend code/ })).toBeDisabled();
  await screenshot(page, "login-email-code");
  const result: { code: string } = await page.evaluate(async () =>
    (await fetch("/__fixture/code")).json()
  );
  expect(result.code).toMatch(/^\d{6}$/);
  await page.getByLabel("Sign-in code", { exact: true }).fill(result.code);
  await page.getByRole("button", { name: "Verify code and continue" }).click();
  await expect(page.getByRole("heading", { name: "Signed in to app-center" })).toBeVisible();
  const second = await context.newPage();
  await second.goto(fixture.origins.hr);
  await second.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(second.getByRole("heading", { name: "Signed in to hr" })).toBeVisible();
});

test("correcting an email typo can complete sign-in during the original resend cooldown", async ({
  page,
}) => {
  await openLogin(page);
  await page.getByLabel("Email address").fill(`typo-${fixture.email}`);
  await page.getByRole("button", { name: "Email me a sign-in code" }).click();
  await expect(page.getByLabel("Sign-in code", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Use a password instead" }).click();
  await page.getByRole("button", { name: "Use an email code instead" }).click();
  await page.getByLabel("Email address").fill(fixture.email);
  await page.getByRole("button", { name: "Email me a sign-in code" }).click();
  await expect(page.getByLabel("Sign-in code", { exact: true })).toBeVisible();
  const result: { code: string } = await page.evaluate(async () =>
    (await fetch("/__fixture/code")).json()
  );
  await page.getByLabel("Sign-in code", { exact: true }).fill(result.code);
  await page.getByRole("button", { name: "Verify code and continue" }).click();
  await expect(page.getByRole("heading", { name: "Signed in to app-center" })).toBeVisible();
});
