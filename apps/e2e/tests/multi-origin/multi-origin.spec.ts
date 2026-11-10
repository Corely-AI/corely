import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
interface Fixture {
  origins: { app: string; invoice: string; login: string; hr: string };
  email: string;
  secondEmail: string;
  workspaceIds: string[];
  invoiceIds: string[];
  tenantIds: string[];
  controlSecret: string;
}
let fixture: Fixture;
function load(): Fixture {
  const directory = process.env.SSO_TEST_OUTPUT_DIR;
  if (!directory) {
    throw new Error("Disposable multi-origin setup required");
  }
  const value = JSON.parse(readFileSync(join(directory, "fixture.json"), "utf8")) as Fixture;
  const expected = [
    "https://login.corely.test:8444",
    "https://app.corely.test:8444",
    "https://invoice.app.corely.test:8444",
    "https://hr.app.corely.test:8444",
  ];
  if (Object.values(value.origins).some((origin) => !expected.includes(origin))) {
    throw new Error("Refusing non-loopback fixture target");
  }
  return value;
}
async function control(
  request: APIRequestContext,
  action: "reset" | "expire" | "revoke" | "deny" | "snapshot"
) {
  const result = await request.post(`${fixture.origins.login}/__fixture/control?action=${action}`, {
    headers: { "x-fixture-control": fixture.controlSecret },
  });
  expect(result.status()).toBe(200);
  return result.json() as Promise<unknown>;
}
async function login(page: Page, second = false, destination?: string) {
  await test.step("open sign-in entry", async () => {
    await page.goto(
      destination ?? `${fixture.origins.app}/?workspaceId=${fixture.workspaceIds[second ? 2 : 0]}`
    );
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
  });
  await test.step("enter synthetic credentials", async () => {
    await page.getByRole("button", { name: "Use a password instead", exact: true }).click();
    await page.getByLabel("Email address").fill(second ? fixture.secondEmail : fixture.email);
    await page.getByLabel("Password", { exact: true }).fill("Synthetic-SSO-384!");
    await page.getByRole("button", { name: "Sign in and continue", exact: true }).click();
  });
}
async function invoice(page: Page) {
  await test.step("launch focused Invoice", async () => {
    await page.getByRole("button", { name: "Open: Invoice", exact: true }).click();
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
  });
  await expect(page.getByTestId(`invoice-row-${fixture.invoiceIds[0]}`)).toBeVisible();
}
async function apiStatus(
  page: Page,
  path: string,
  tenant: string,
  workspace: string,
  method = "GET"
) {
  return page.evaluate(
    async ({ path, tenant, workspace, method }) => {
      const result = await fetch(path, {
        method,
        headers: {
          "x-tenant-id": tenant,
          "x-workspace-id": workspace,
          ...(method === "GET" ? {} : { "Content-Type": "application/json" }),
        },
        ...(method === "GET" ? {} : { body: "{}" }),
      });
      return result.status;
    },
    { path, tenant, workspace, method }
  );
}
test.beforeEach(async ({ request, page }) => {
  page.on("requestfailed", (request) => {
    const known = new Map([
      ["net::ERR_ABORTED", "aborted"],
      ["net::ERR_CONNECTION_CLOSED", "connection-closed"],
      ["net::ERR_CONNECTION_RESET", "connection-reset"],
      ["net::ERR_TUNNEL_CONNECTION_FAILED", "tunnel-failed"],
      ["net::ERR_SSL_PROTOCOL_ERROR", "tls-failed"],
    ]);
    const kind = known.get(request.failure()?.errorText ?? "") ?? "other";
    test.info().annotations.push({ type: "safe-state", description: `network:${kind}` });
  });
  page.on("response", (response) => {
    if (response.status() < 400) {
      return;
    }
    const path = new URL(response.url()).pathname;
    const operation =
      [
        "/api/session/current",
        "/api/session/preauth",
        "/api/session/login",
        "/api/session/logout",
        "/api/session/",
        "/api/bff/workspaces",
        "/api/bff/menu",
        "/api/bff/invoices",
        "/sso/",
        "/auth/",
        "/assets/",
      ].find((root) => path.startsWith(root)) ?? "other";
    test.info().annotations.push({
      type: "safe-http",
      description: JSON.stringify({ operation, status: response.status() }),
    });
  });
  fixture = load();
  await control(request, "reset");
});

test.afterEach(async ({ page, context }, info) => {
  if (info.status === info.expectedStatus || !fixture || page.isClosed()) {
    return;
  }
  const origin = new URL(page.url()).origin;
  const location =
    Object.entries(fixture.origins).find(([, value]) => value === origin)?.[0] ?? "other";
  const cookies = await context.cookies();
  const menuState = await page
    .locator('[role="menu"]')
    .evaluateAll((elements) => elements[0]?.getAttribute("data-state") ?? "none");
  for (const state of [
    `location:${location}`,
    `preauth:${cookies.some((cookie) => cookie.name === "__Host-corely-preauth")}`,
    `central:${cookies.some((cookie) => cookie.name === "__Host-corely-login")}`,
    `app-session:${cookies.some((cookie) => cookie.name === "__Host-corely-session")}`,
    `menu:${menuState === "open" || menuState === "closed" ? menuState : "none"}`,
  ]) {
    info.annotations.push({ type: "safe-state", description: state });
  }
});

test("fresh App Center login opens Invoice with existing SSO and returns through All apps", async ({
  page,
  context,
}, info) => {
  await test.step("sign in and select Invoice", async () => {
    await login(page);
    await expect(
      page.getByRole("heading", { name: "Your workspace, connected.", exact: true })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Open: Invoice", exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath(`app-center-${info.project.name}.png`) });
    await invoice(page);
  });
  await test.step("verify host cookies and workspace handoff", async () => {
    expect(new URL(page.url()).origin).toBe(fixture.origins.invoice);
    expect(new URL(page.url()).searchParams.get("workspaceId")).toBe(fixture.workspaceIds[0]);
    await expect(page.getByRole("combobox", { name: "Workspace", exact: true })).toHaveValue(
      fixture.workspaceIds[0]
    );
    const cookies = await context.cookies();
    const sessionCookies = cookies.filter((cookie) => cookie.name === "__Host-corely-session");
    expect(sessionCookies.map((cookie) => cookie.domain).sort()).toEqual([
      "app.corely.test",
      "invoice.app.corely.test",
    ]);
    for (const cookie of sessionCookies) {
      expect(cookie.httpOnly && cookie.secure && cookie.path === "/").toBe(true);
    }
    expect(await page.evaluate(() => localStorage.getItem("accessToken"))).toBeNull();
    await page.screenshot({
      path: info.outputPath(`invoice-shell-${info.project.name}.png`),
      mask: [page.locator("main")],
    });
    const switcher = page.getByRole("button", { name: "Switch apps", exact: true });
    await switcher.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menu")).toBeVisible();
    await expect(page.getByRole("menu")).toBeFocused();
    await page.getByRole("menu").press("Escape");
    await expect(page.getByRole("menu")).toBeHidden();
    await expect(switcher).toBeFocused();
    await page.getByRole("button", { name: "All apps", exact: true }).click();
    await expect(page.getByRole("button", { name: "Open: Invoice", exact: true })).toBeVisible();
    expect(new URL(page.url()).origin).toBe(fixture.origins.app);
  });
});

test("bookmarked invoice detail survives sign-in and refresh without changing scope", async ({
  page,
}) => {
  await login(
    page,
    false,
    `${fixture.origins.invoice}/invoices/${fixture.invoiceIds[0]}?workspaceId=${fixture.workspaceIds[0]}`
  );
  await expect(page.getByTestId("invoice-line-description-0")).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(`/invoices/${fixture.invoiceIds[0]}`);
  await page.reload();
  await expect(page.getByTestId("invoice-line-description-0")).toBeVisible();
  expect(new URL(page.url()).searchParams.get("workspaceId")).toBe(fixture.workspaceIds[0]);
});

test("workspace changes distinguish multiple workspaces and two tenant memberships", async ({
  page,
}) => {
  await login(page);
  await invoice(page);
  const workspace = page.getByRole("combobox", { name: "Workspace", exact: true });
  await workspace.selectOption(fixture.workspaceIds[1]);
  await expect(page.getByRole("heading", { name: "No invoices yet", exact: true })).toBeVisible();
  await workspace.selectOption(fixture.workspaceIds[2]);
  await expect(page.getByTestId(`invoice-row-${fixture.invoiceIds[1]}`)).toBeVisible();
  await expect(page.getByTestId(`invoice-row-${fixture.invoiceIds[0]}`)).toHaveCount(0);
});

test("forged context, unrelated routes, foreign records and direct APIs cannot mutate another workspace", async ({
  page,
  request,
}) => {
  await login(page);
  await invoice(page);
  const before = await control(request, "snapshot");
  const redirects = await page.evaluate(async () => {
    const boot = (await (await fetch("/api/session/preauth")).json()) as { csrfToken: string };
    const statuses: number[] = [];
    for (const returnPath of [
      "https://evil.example/",
      "//evil.example/",
      "/sso/authorize?request=synthetic",
    ]) {
      const response = await fetch("/api/session/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnPath, csrfToken: boot.csrfToken }),
      });
      statuses.push(response.status);
    }
    return statuses;
  });
  expect(redirects).toEqual([400, 400, 400]);

  expect(
    await apiStatus(
      page,
      `/api/bff/invoices/${fixture.invoiceIds[1]}`,
      fixture.tenantIds[0],
      fixture.workspaceIds[0]
    )
  ).toBe(404);
  expect(
    await apiStatus(page, "/api/bff/invoices", fixture.tenantIds[0], fixture.workspaceIds[2])
  ).toBe(403);
  expect(
    await apiStatus(page, "/api/bff/people/staff", fixture.tenantIds[0], fixture.workspaceIds[0])
  ).toBe(404);
  expect(
    await apiStatus(
      page,
      `/api/bff/invoices/${fixture.invoiceIds[1]}`,
      fixture.tenantIds[0],
      fixture.workspaceIds[2],
      "PATCH"
    )
  ).toBe(401);
  const direct = await request.get(`${fixture.origins.login}/invoices`, {
    headers: { "x-tenant-id": fixture.tenantIds[0], "x-workspace-id": fixture.workspaceIds[0] },
  });
  expect(direct.status()).toBe(401);
  await page.goto(`${fixture.origins.invoice}/people/staff?workspaceId=${fixture.workspaceIds[0]}`);
  await expect(page.getByRole("heading", { name: "Page not found", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Staff directory", exact: true })).toHaveCount(0);
  expect(await control(request, "snapshot")).toEqual(before);
});

test("a second account cannot launch Invoice or use another tenant's workspace hint", async ({
  page,
  request,
}) => {
  await login(page, true);
  await expect(
    page.getByRole("heading", { name: "Your workspace, connected.", exact: true })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Open: Invoice", exact: true })).toHaveCount(0);
  expect(
    await apiStatus(page, "/api/bff/invoices", fixture.tenantIds[1], fixture.workspaceIds[2])
  ).toBe(403);
  const before = await control(request, "snapshot");
  expect(
    await apiStatus(page, "/api/bff/invoices", fixture.tenantIds[0], fixture.workspaceIds[0])
  ).toBe(403);
  await page.goto(`${fixture.origins.app}/?workspaceId=${fixture.workspaceIds[0]}`);
  await expect(page.getByRole("alert")).toContainText("requested workspace is unavailable");
  expect(await control(request, "snapshot")).toEqual(before);
});

for (const action of ["revoke", "deny"] as const) {
  test(`${action} access withdraws cached invoice records on fresh verification`, async ({
    page,
    request,
  }) => {
    await login(page);
    await invoice(page);
    await control(request, action);
    await page.reload();
    await expect(page.getByTestId(`invoice-row-${fixture.invoiceIds[0]}`)).toHaveCount(0);
    await expect(page.getByRole("alert")).toBeVisible();
    expect(
      await apiStatus(page, "/api/bff/invoices", fixture.tenantIds[0], fixture.workspaceIds[0])
    ).toBe(403);
  });
}

test("expiry requires explicit sign-in and existing central SSO restores the same workspace", async ({
  page,
  request,
}) => {
  await login(page);
  await invoice(page);
  await control(request, "expire");
  await page.reload();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.getByTestId(`invoice-row-${fixture.invoiceIds[0]}`)).toHaveCount(0);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByTestId(`invoice-row-${fixture.invoiceIds[0]}`)).toBeVisible();
});

test("Invoice logout revokes the open App Center session and central reuse", async ({
  page,
  context,
}) => {
  await login(page);
  await expect(page.getByRole("button", { name: "Open: Invoice", exact: true })).toBeVisible();
  const center = await context.newPage();
  await center.goto(`${fixture.origins.app}/?workspaceId=${fixture.workspaceIds[0]}`);
  await expect(center.getByRole("button", { name: "Open: Invoice", exact: true })).toBeVisible();
  await page.bringToFront();
  await invoice(page);
  await page.getByRole("button", { name: "Account", exact: true }).click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  const status = await center.evaluate(async () => (await fetch("/api/session/user")).status);
  expect(status).toBe(401);
  await center.bringToFront();
  await center.reload();
  await expect(center.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  await center.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(center.getByLabel("Email address")).toBeVisible();
});
