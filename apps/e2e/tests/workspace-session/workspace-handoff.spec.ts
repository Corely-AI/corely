import { test, expect, type BrowserContext } from "@playwright/test";
import {
  fixtureApp,
  fixtureOrigins,
  workspaceFixtureResponse,
  type FixtureUser,
} from "../../../../packages/web-shared/testkit/workspace-api-fixture";
const origins = fixtureOrigins("5187");
interface SeenRequest {
  path: string;
  user: FixtureUser;
  tenant: string | null;
  workspace: string | null;
  method: string;
}
async function transport(context: BrowserContext) {
  let user: FixtureUser = "user-a";
  const seen: SeenRequest[] = [];
  let releaseRead: (() => void) | undefined;
  let releaseWrite: (() => void) | undefined;
  let holdRead = false;
  let holdWrite = false;
  let failWrite = false;
  await context.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const headers = new Headers(await request.allHeaders());
    const snapshot = user;
    seen.push({
      path: url.pathname,
      user: snapshot,
      tenant: headers.get("x-tenant-id"),
      workspace: headers.get("x-workspace-id"),
      method: request.method(),
    });
    if (url.pathname === "/api/bff/invoices" && request.method() === "POST") {
      if (failWrite) {
        await route.abort("failed");
        return;
      }
      if (holdWrite) {
        await new Promise<void>((resolve) => {
          releaseWrite = resolve;
        });
      }
    }
    if (
      holdRead &&
      url.pathname === "/api/bff/invoices" &&
      request.method() === "GET" &&
      headers.get("x-workspace-id") === "workspace-a"
    ) {
      await new Promise<void>((resolve) => {
        releaseRead = resolve;
      });
    }
    const response = workspaceFixtureResponse(
      url.pathname + url.search,
      headers,
      snapshot,
      fixtureApp(url.hostname),
      origins
    );
    // A cancelled old-scope fetch may already have been detached by the browser.
    try {
      await route.fulfill({ status: response.status, json: await response.json() });
    } catch (error) {
      if (!/ERR_ABORTED|NS_BINDING_ABORTED/.test(request.failure()?.errorText ?? "")) {
        throw error;
      }
    }
  });
  return {
    seen,
    switchAccount: () => {
      user = "user-b";
    },
    delayRead: () => {
      holdRead = true;
    },
    releaseRead: () => {
      holdRead = false;
      releaseRead?.();
    },
    delayWrite: () => {
      holdWrite = true;
    },
    releaseWrite: () => {
      holdWrite = false;
      releaseWrite?.();
    },
    failWrite: () => {
      failWrite = true;
    },
  };
}

test("App Center → Invoice → HR → App Center preserves an authorized workspace", async ({
  page,
  context,
}) => {
  await transport(context);
  await page.goto(`${origins["app-center"]}/?workspaceId=workspace-b`);
  await page.getByRole("link", { name: "Invoice", exact: true }).click();
  await expect(page.getByText("Records: user-a/tenant-b/workspace-b")).toBeVisible();
  await expect(page).toHaveURL(`${origins.invoice}/?workspaceId=workspace-b`);
  await page.getByLabel("Unsaved note").fill("Explicitly discard for app switch");
  const nativeDialogs: string[] = [];
  page.on("dialog", (dialog) => {
    nativeDialogs.push(dialog.type());
    void dialog.dismiss();
  });
  await page.getByRole("button", { name: "Switch apps", exact: true }).click();
  await page.getByRole("menuitem", { name: "HR", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Leave page", exact: true }).click();
  await expect(page).toHaveURL(`${origins.hr}/?workspaceId=workspace-b`);
  expect(nativeDialogs).toEqual([]);
  await expect(page.getByText("Records: user-a/tenant-b/workspace-b")).toBeVisible();
  await page.getByRole("button", { name: "All apps", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your apps" })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("workspaceId")).toBe("workspace-b");
});

test("local shell navigation and new-tab links retain the verified workspace", async ({
  page,
  context,
}, testInfo) => {
  await transport(context);
  await page.goto(`${origins.invoice}/?workspaceId=workspace-b`);
  const invoices = page.getByRole("link", { name: "Invoices", exact: true }).first();
  await expect(invoices).toHaveAttribute("href", "/invoices?workspaceId=workspace-b");
  const otherTab = await context.newPage();
  await otherTab.goto(new URL((await invoices.getAttribute("href")) ?? "", origins.invoice).href);
  await expect(otherTab.getByText("Records: user-a/tenant-b/workspace-b")).toBeVisible();
  await otherTab.close();
  await invoices.click();
  await expect(page).toHaveURL(`${origins.invoice}/invoices?workspaceId=workspace-b`);
  await expect(page.getByText("Records: user-a/tenant-b/workspace-b")).toBeVisible();
  await page.getByRole("button", { name: "New invoice", exact: true }).click();
  await expect(page).toHaveURL(`${origins.invoice}/invoices/new?workspaceId=workspace-b`);
  await expect(page.getByText("Records: user-a/tenant-b/workspace-b")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("local-navigation-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Navigation", exact: true }).click();
  await expect(page.getByRole("link", { name: "Invoices", exact: true })).toHaveAttribute(
    "href",
    "/invoices?workspaceId=workspace-b"
  );
  await page.getByRole("link", { name: "Invoices", exact: true }).click();
  await expect(page).toHaveURL(`${origins.invoice}/invoices?workspaceId=workspace-b`);
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByText("Records: user-a/tenant-b/workspace-b")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("local-navigation-mobile.png") });
});

test("altered/deleted workspace hints and unavailable apps never mount feature data", async ({
  page,
  context,
}) => {
  const f = await transport(context);
  await page.goto(`${origins.invoice}/?workspaceId=deleted`);
  await expect(page.getByRole("alert")).toContainText("requested workspace is unavailable");
  expect(f.seen.some((entry) => entry.path === "/api/bff/invoices")).toBe(false);
  f.switchAccount();
  await page.goto(`${origins.invoice}/?workspaceId=workspace-a`);
  await expect(page.getByRole("alert")).toContainText("requested workspace is unavailable");
  await page.goto(`${origins.hr}/?workspaceId=workspace-b`);
  await expect(page.getByRole("alert")).toContainText("app is unavailable");
  expect(
    f.seen.some(
      (entry) => entry.path === "/api/bff/people/staff" || entry.path === "/api/bff/invoices"
    )
  ).toBe(false);
});

test("dirty forms guard workspace changes and browser back navigation without cross-tab retargeting", async ({
  page,
  context,
}) => {
  await transport(context);
  await page.goto(`${origins.invoice}/?workspaceId=workspace-a`);
  await page.getByLabel("Unsaved note").fill("Linden draft");
  const second = await context.newPage();
  await second.goto(`${origins.invoice}/?workspaceId=workspace-b`);
  await expect(second.getByText("Records: user-a/tenant-b/workspace-b")).toBeVisible();
  await second.evaluate(() => localStorage.setItem("activeWorkspaceId", "workspace-b"));
  await page.bringToFront();
  await expect(page.getByLabel("Unsaved note")).toHaveValue("Linden draft");
  await page.getByRole("button", { name: "Choose River", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toContainText("unsaved changes");
  await page.getByRole("button", { name: "Stay", exact: true }).click();
  await expect(page.getByLabel("Unsaved note")).toHaveValue("Linden draft");
  await page.getByRole("button", { name: "Choose River", exact: true }).click();
  await page.getByRole("button", { name: "Leave page", exact: true }).click();
  await expect(page.getByText("Records: user-a/tenant-b/workspace-b")).toBeVisible();
  await page.getByLabel("Unsaved note").fill("River draft");
  await page.goBack();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Stay", exact: true }).click();
  await expect(page.getByLabel("Unsaved note")).toHaveValue("River draft");
});

test("late tenant responses and account changes cannot revive another scope's records", async ({
  page,
  context,
}) => {
  const f = await transport(context);
  f.delayRead();
  await page.goto(`${origins.invoice}/?workspaceId=workspace-a`);
  await expect(page.getByRole("heading", { name: "Invoice workspace" })).toBeVisible();
  await page.getByRole("button", { name: "Choose River", exact: true }).click();
  await expect(page.getByText("Records: user-a/tenant-b/workspace-b")).toBeVisible();
  f.releaseRead();
  await expect(page.getByText("Records: user-a/tenant-a/workspace-a")).toHaveCount(0);
  f.switchAccount();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByText("Records: user-b/tenant-b/workspace-b")).toBeVisible();
  await expect(page.getByText("Records: user-a/tenant-b/workspace-b")).toHaveCount(0);
});

test("pending writes require a known result and offline commands never replay into a new account", async ({
  page,
  context,
}) => {
  const f = await transport(context);
  await page.goto(`${origins.invoice}/?workspaceId=workspace-a`);
  await page.getByRole("heading", { name: "Invoice workspace" }).waitFor();
  f.delayWrite();
  await page.getByRole("button", { name: "Save fixture change", exact: true }).click();
  await page.getByRole("button", { name: "Choose River", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toContainText("request is still running");
  await expect(page.getByRole("button", { name: "Leave page", exact: true })).toBeDisabled();
  f.releaseWrite();
  await expect(page.getByRole("button", { name: "Leave page", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Leave page", exact: true }).click();
  await expect(page.getByText("Records: user-a/tenant-b/workspace-b")).toBeVisible();
  f.failWrite();
  await page.getByRole("button", { name: "Save fixture change", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("temporarily unavailable");
  f.switchAccount();
  await page.reload();
  await expect(page.getByText("Records: user-b/tenant-b/workspace-b")).toBeVisible();
  const writes = f.seen.filter((entry) => entry.method === "POST");
  expect(writes).toHaveLength(2);
  expect(writes.map((entry) => [entry.user, entry.tenant, entry.workspace])).toEqual([
    ["user-a", "tenant-a", "workspace-a"],
    ["user-a", "tenant-b", "workspace-b"],
  ]);
});
