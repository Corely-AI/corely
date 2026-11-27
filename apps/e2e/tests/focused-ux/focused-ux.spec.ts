import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  OpenBukBookSchema,
  OpenBukPublicStudioSchema,
  OpenBukReceiptSchema,
} from "@corely/contracts";
import { invoiceTransport } from "../focused-invoice/invoice-fixture";
import {
  workspaceFixtureResponse,
  fixtureOrigins,
} from "../../../../packages/web-shared/testkit/workspace-api-fixture";
async function audit(page: Page) {
  await page.evaluate(async () => {
    await Promise.allSettled(
      document
        .getAnimations()
        .filter((animation) => Number.isFinite(animation.effect?.getComputedTiming().endTime))
        .map((animation) => animation.finished)
    );
  });
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map(({ id, impact, nodes }) => ({
      id,
      impact,
      targets: nodes.map((node) => ({ target: node.target, reason: node.failureSummary })),
    }))
  ).toEqual([]);
}
async function center(context: BrowserContext) {
  await context.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const url = new URL(route.request().url());
      const response = workspaceFixtureResponse(
        url.pathname + url.search,
        new Headers(await route.request().allHeaders()),
        "user-a",
        "app-center",
        fixtureOrigins("5193")
      );
      await route.fulfill({ status: response.status, json: await response.json() });
    }
  );
}
test("App Center supports keyboard search/categories and narrow-screen accessible navigation", async ({
  page,
  context,
}, info) => {
  await center(context);
  await page.goto("http://127.0.0.1:5193/?workspaceId=workspace-a");
  await expect(page.locator("h1")).toBeVisible({ timeout: 15_000 });
  await audit(page);
  const search = page.locator('input[type="search"]');
  await search.focus();
  await page.keyboard.type("no-such-app");
  await expect(page.locator("main article")).toHaveCount(0);
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Backspace");
  await expect(page.locator("main article")).toHaveCount(2);
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await audit(page);
  await page.screenshot({ path: info.outputPath(`app-center-${info.project.name}-phone.png`) });
});
test("Invoice list/editor has accessible controls and complete shell locale", async ({
  page,
  context,
}, info) => {
  const locale = info.project.name;
  await context.addInitScript((language) => {
    localStorage.setItem("Corely One ERP-language", language);
  }, locale);
  await invoiceTransport(context);
  await page.goto("http://127.0.0.1:5188/invoices?workspaceId=workspace-a");
  await expect(page.getByTestId("invoice-row-invoice-1")).toBeVisible({ timeout: 15_000 });
  await audit(page);
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
  const switcher = page.getByRole("button", {
    name: { en: "Switch apps", de: "App wechseln", vi: "Chuyển ứng dụng" }[locale],
  });
  await switcher.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(switcher).toBeFocused();
  await page.goto("http://127.0.0.1:5188/invoices/invoice-1/edit?workspaceId=workspace-a");
  await expect(page.getByTestId("invoice-line-description-0")).toBeVisible();
  await audit(page);
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page
      .locator("main#focused-content")
      .evaluate((element) => element.scrollWidth <= element.clientWidth)
  ).toBe(true);
  expect(
    await page
      .locator("header button")
      .evaluateAll((elements) =>
        elements.every((element) => element.getBoundingClientRect().right <= innerWidth)
      )
  ).toBe(true);
  await audit(page);
  await page.screenshot({ path: info.outputPath(`invoice-${locale}-phone.png`) });
  await page.keyboard.press("ControlOrMeta+k");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("[data-command-palette-input]")).toBeFocused();
  await audit(page);
  await page.screenshot({ path: info.outputPath(`palette-${locale}-phone.png`) });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});
test("expired central login remains localized and accessible", async ({ page }, info) => {
  await page.goto("http://127.0.0.1:5192/login");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", info.project.name);
  await audit(page);
  await page.screenshot({ path: info.outputPath(`login-expired-${info.project.name}.png`) });
});

test("invoice selection uses the French catalog for labels and counts", async ({
  page,
  context,
}, info) => {
  await invoiceTransport(context);
  await page.goto("http://127.0.0.1:5188/invoices?workspaceId=workspace-a&lang=fr");
  const invoice = page.getByTestId("invoice-row-invoice-1");
  await expect(invoice).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(invoice.getByText(/357,00\s*€/)).toBeVisible();
  await expect(invoice.getByText(/9 nov\. 2026/)).toBeVisible();
  await invoice.getByRole("checkbox").check();
  await expect(page.getByText(/Sélection\s*: 1/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Supprimer la sélection" })).toBeVisible();
  await audit(page);
  await page.screenshot({ path: info.outputPath("invoice-french-selection.png") });
});

test("App Center persists a new language and keeps the workspace selection", async ({
  page,
  context,
}, info) => {
  await center(context);
  await page.goto("http://127.0.0.1:5193/?workspaceId=workspace-a&lang=en");
  await expect(page.locator("main article")).toHaveCount(2);
  await page.getByRole("button", { name: "Language" }).click();
  await page.getByRole("menuitem", { name: "Português (Portugal)" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-PT");
  await expect(page.getByRole("region", { name: "Todas as aplicações" })).toBeVisible();
  await expect(page).toHaveURL(/workspaceId=workspace-a.*lang=pt-PT/);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-PT");
  await expect(page.locator("main article")).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("app-center-portuguese-phone.png") });
});

test("OpenBuk keeps the language requested by the guest through confirmation", async ({
  page,
  context,
}, info) => {
  const studio = OpenBukPublicStudioSchema.parse({
    slug: "linden-test",
    studioName: "Linden Studio",
    timezone: "Europe/Berlin",
    locale: "de",
    currency: "EUR",
    serviceName: "Test Service",
    durationMinutes: 30,
    priceCents: 2500,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    staffName: "Mara",
    minimumNoticeMinutes: 0,
    maximumAdvanceDays: 20,
    serviceId: "service-1",
    staffId: "staff-1",
  });
  const slot = { startAt: "2030-09-09T08:00:00Z", endAt: "2030-09-09T08:30:00Z" };
  await context.route("**/w/linden-test/public/openbuk/studio", (route) =>
    route.fulfill({ json: { studio } })
  );
  await context.route("**/w/linden-test/public/openbuk/availability?*", (route) =>
    route.fulfill({ json: { slots: [slot] } })
  );
  await context.route("**/w/linden-test/public/openbuk/bookings", async (route) => {
    const request = OpenBukBookSchema.parse(route.request().postDataJSON());
    expect(request.startAt).toBe(slot.startAt);
    expect(await route.request().headerValue("Idempotency-Key")).toBeTruthy();
    const receipt = OpenBukReceiptSchema.parse({ ...studio, ...slot, reference: "TEST-PL-1" });
    await route.fulfill({ json: { receipt } });
  });

  await page.goto("http://127.0.0.1:5193/openbuk/book/linden-test?lang=pl");
  await expect(page.getByRole("heading", { name: "Znajdź czas dla siebie." })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.locator("html")).toHaveAttribute("lang", "pl");
  await page.getByRole("button", { name: /10:00/ }).click();
  await page.locator('input[name="name"]').fill("Test Guest");
  await page.getByLabel("E-mail").fill("guest@example.com");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /Potwierdź rezerwację/ }).click();
  await expect(page.getByRole("heading", { name: "Masz rezerwację." })).toBeVisible();
  await expect(page.getByText("TEST-PL-1", { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("openbuk-polish-confirmation.png") });
});
