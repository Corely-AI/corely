import { test, expect, type Page } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
const directory = process.env.SSO_TEST_OUTPUT_DIR;
if (!directory?.startsWith("/private/tmp/")) {
  throw new Error("Disposable fixture required");
}
const fixture: { email: string; origins: { invoice: string; hr: string; login: string } } =
  JSON.parse(readFileSync(`${directory}/fixture.json`, "utf8"));
for (const origin of Object.values(fixture.origins)) {
  if (!/^https:\/\/(?:[\w-]+\.)+corely\.test:8444$/.test(origin)) {
    throw new Error("Local fixture required");
  }
}
async function session(page: Page, app = "invoice") {
  const origin = app === "hr" ? fixture.origins.hr : fixture.origins.invoice;
  await page.goto(`${origin}/session?real=true&app=${app}`);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
async function credentials(page: Page) {
  await page.getByRole("button", { name: "Use a password instead" }).click();
  await page.getByLabel("Email address").fill(fixture.email);
  await page.getByLabel("Password", { exact: true }).fill("Synthetic-SSO-384!");
  await page.getByRole("button", { name: "Sign in and continue" }).click();
}
async function capture(page: Page, name: string) {
  if (process.env.SSO_CAPTURE_EVIDENCE !== "true") {
    return;
  }
  const output = resolve(import.meta.dirname, "../../../../docs/tasks/387-assets");
  mkdirSync(output, { recursive: true });
  await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
}
test("Invoice logout revokes an open HR tab and central SSO with real shared providers", async ({
  page,
  context,
}) => {
  test.setTimeout(60_000);
  await session(page);
  await credentials(page);
  await expect(page.getByRole("heading", { name: "invoice workspace" })).toBeVisible();
  await capture(page, "authenticated-desktop");
  const hr = await context.newPage();
  await session(hr, "hr");
  await expect(hr.getByRole("heading", { name: "hr workspace" })).toBeVisible();
  await page.bringToFront();
  await page.getByRole("button", { name: "Sign out of Corely" }).click();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  await capture(page, "signed-out-desktop");
  // A different origin never trusts BroadcastChannel. Its next server request is rejected.
  const status = await hr.evaluate(async () => (await fetch("/api/session/user")).status);
  expect(status).toBe(401);
  await hr.bringToFront();
  await expect(hr.getByRole("button", { name: "Sign in", exact: true })).toBeVisible({
    timeout: 40_000,
  });
  await expect(hr.getByText(/Signed in as/)).toHaveCount(0);
  await hr.setViewportSize({ width: 390, height: 844 });
  await capture(hr, "revoked-hr-mobile");
  await hr.getByRole("button", { name: "Sign in", exact: true }).click();
  // The old central host cookie still exists but cannot silently reauthenticate.
  await expect(hr.getByLabel("Email address")).toBeVisible();
  expect(new URL(hr.url()).origin).toBe(fixture.origins.login);
});
test("same-origin tabs clear on logout and outage does not restore private content", async ({
  page,
  context,
}) => {
  await session(page);
  await credentials(page);
  await expect(page.getByRole("heading", { name: "invoice workspace" })).toBeVisible();
  const second = await context.newPage();
  await second.goto(`${fixture.origins.invoice}/session?real=true&app=invoice`);
  await expect(second.getByRole("heading", { name: "invoice workspace" })).toBeVisible();
  await page.bringToFront();
  await page.route("**/api/session/logout", (route) => route.fulfill({ status: 503 }));
  await page.getByRole("button", { name: "Sign out of Corely" }).click();
  await expect(page.getByRole("alert")).toContainText("Sign-out could not be confirmed");
  await expect(second.getByText(/Signed in as/)).toHaveCount(0);
  await capture(page, "logout-failed-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "logout-failed-mobile");
  await page.unroute("**/api/session/logout");
  await page.getByRole("button", { name: "Retry sign out" }).click();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
});

test("old-origin migration clears tokens/cache but preserves and blocks ownerless offline work", async ({
  page,
}) => {
  await page.goto(`${fixture.origins.invoice}/session?app=invoice`);
  await page.evaluate(async () => {
    localStorage.setItem("accessToken", "synthetic-retired-token");
    localStorage.setItem("refreshToken", "synthetic-retired-refresh");
    localStorage.setItem("corely:old-account", "synthetic private cache");
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("corely_offline", 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("outbox", { keyPath: "commandId" });
        request.result.createObjectStore("queryCache");
      };
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(["outbox", "queryCache"], "readwrite");
        tx.objectStore("outbox").put({
          commandId: "synthetic-pending",
          workspaceId: "old-workspace",
          status: "PENDING",
        });
        tx.objectStore("queryCache").put({ synthetic: "private cached read" }, "old-account");
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  });
  await page.goto(`${fixture.origins.invoice}/session?app=invoice&migrate=true`);
  await expect(page.getByRole("alert")).toContainText("Old offline work needs recovery");
  await expect(page.getByText(/Signed in as/)).toHaveCount(0);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  const counts = await page.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        const request = indexedDB.open("corely_offline");
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(["outbox", "queryCache"], "readonly");
          const outbox = tx.objectStore("outbox").count();
          const cache = tx.objectStore("queryCache").count();
          tx.oncomplete = () => {
            db.close();
            resolve([outbox.result, cache.result]);
          };
        };
      })
  );
  expect(counts).toEqual([1, 0]);
  await capture(page, "migration-blocked");
});
