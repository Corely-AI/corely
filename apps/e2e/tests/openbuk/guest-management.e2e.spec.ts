import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test.beforeAll(() => {
  const web = new URL(process.env.OPENBUK_BASE_URL ?? "http://127.0.0.1:8080");
  const db = new URL(process.env.OPENBUK_TEST_DATABASE_URL ?? "postgresql://localhost");
  if (
    !["127.0.0.1", "localhost"].includes(web.hostname) ||
    !["127.0.0.1", "localhost"].includes(db.hostname) ||
    !/^\/openbuk_test_[a-z0-9_]+$/.test(db.pathname)
  )
    throw new Error("Guest management acceptance requires disposable local OpenBuk services");
});

test("an anonymous guest can move and cancel only the appointment granted by a private link", async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(100_000);
  const studio = `Guest studio ${randomUUID().slice(0, 8)}`;
  await page.goto("/openbuk/signup?lang=en");
  await page.getByLabel("Your name", { exact: true }).fill("Guest test manager");
  await page.getByLabel("Studio name", { exact: true }).fill(studio);
  await page.getByLabel("Email", { exact: true }).fill(`${randomUUID()}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill("OpenBuk-Guest-Test-2026!");
  await page.getByRole("button", { name: "Start free", exact: true }).click();
  const access = await (
    await page.waitForFunction(() => localStorage.getItem("accessToken"))
  ).jsonValue();
  expect(
    (
      await page.request.post("/api/workspaces/pilot-setup/start", {
        headers: { Authorization: `Bearer ${access}` },
        data: { name: studio, countryCode: "DE", currency: "EUR" },
      })
    ).ok()
  ).toBe(true);
  await page.goto("/openbuk/app/settings?lang=en");
  await page.getByLabel("Studio name", { exact: true }).fill(studio);
  await page.getByLabel("Time zone", { exact: true }).fill("Europe/Berlin");
  await page.getByLabel("Service name", { exact: true }).fill("Consultation");
  await page.getByLabel("Team member’s name", { exact: true }).fill("Dora");
  await page.getByRole("button", { name: "Save & publish booking page" }).click();
  const site = await page.getByRole("link", { name: "Open booking page" }).getAttribute("href");
  expect(site).toBeTruthy();
  const slug = new URL(site!, page.url()).pathname.split("/").at(-1);
  const guest = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  try {
    const phone = await guest.newPage();
    await phone.goto(`${site!}?lang=en`);
    const monday = new Date();
    monday.setUTCDate(monday.getUTCDate() + ((8 - monday.getUTCDay()) % 7 || 7));
    const day = monday.toISOString().slice(0, 10);
    await phone.getByLabel("Date · Europe/Berlin").fill(day);
    await phone
      .getByRole("button", { name: /09:00|9:00/ })
      .first()
      .click();
    await phone.getByLabel("Full name", { exact: true }).fill("Private guest");
    await phone.getByLabel("Email", { exact: true }).fill("private-guest@example.test");
    await phone.locator('input[name="consentAccepted"]').check();
    const emailConfirmation = phone.getByRole("checkbox", {
      name: "Email me a booking confirmation (optional)",
    });
    await expect(emailConfirmation).not.toBeChecked();
    await phone.locator(".customer-form").screenshot({
      path: testInfo.outputPath("confirmation-opt-in-mobile.png"),
    });
    await phone.setViewportSize({ width: 1280, height: 800 });
    await phone.locator(".customer-form").screenshot({
      path: testInfo.outputPath("confirmation-opt-in-desktop.png"),
    });
    await phone.setViewportSize({ width: 390, height: 844 });
    await emailConfirmation.focus();
    await phone.keyboard.press("Space");
    await expect(emailConfirmation).toBeChecked();
    const submittedBooking = phone.waitForRequest(
      (request) => request.method() === "POST" && request.url().endsWith("/public/openbuk/bookings")
    );
    await phone.getByRole("button", { name: "Confirm booking" }).click();
    expect((await submittedBooking).postDataJSON()).toMatchObject({
      confirmationEmailRequested: true,
    });
    await expect(phone.getByRole("heading", { name: "You’re booked in." })).toBeVisible();
    const manage = phone.getByRole("link", { name: "Manage appointment" });
    const href = await manage.getAttribute("href");
    expect(href).toMatch(/#manage=[A-Za-z0-9_-]{43}$/);
    const token = new URLSearchParams(new URL(href!, phone.url()).hash.slice(1)).get("manage")!;
    await manage.click();
    await expect(phone.getByRole("heading", { name: "Consultation" })).toBeVisible();
    await phone.screenshot({ path: testInfo.outputPath("guest-management-mobile.png") });
    expect(
      await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true);
    const endpoint = `/api/w/${slug}/public/openbuk/manage`;
    const legacy = await guest.request.get(`/api/w/${slug}/public/booking/pages/${slug}`);
    expect(legacy.status()).toBe(404);
    expect(await legacy.json()).toMatchObject({ detail: "Use the OpenBuk booking page" });
    const projection = await guest.request.post(endpoint, { data: { token } });
    expect(projection.ok()).toBe(true);
    expect(Object.keys(await projection.json()).sort()).toEqual(
      [
        "canMove",
        "endAt",
        "reference",
        "serviceName",
        "staffName",
        "startAt",
        "timezone",
        "version",
      ].sort()
    );
    const forged = await guest.request.post(endpoint, { data: { token: "a".repeat(43) } });
    expect(forged.status()).toBe(404);
    const wrongStudio = await guest.request.post(
      `/api/w/test-missing-${randomUUID()}/public/openbuk/manage`,
      { data: { token } }
    );
    expect(wrongStudio.status()).toBe(404);

    await phone.getByRole("button", { name: "Move appointment" }).click();
    const options = phone.getByRole("combobox", { name: "New time", exact: true });
    await expect(options).toBeEnabled({ timeout: 15_000 });
    await options.selectOption({ index: 2 });
    await phone.getByRole("button", { name: "Confirm move" }).click();
    await expect(phone.getByRole("status")).toHaveText("Your appointment has moved.");

    await phone.getByRole("button", { name: "Cancel appointment" }).click();
    const panel = phone.getByRole("region", { name: "Cancel appointment", exact: true });
    await panel.screenshot({ path: testInfo.outputPath("guest-cancel-mobile.png") });
    const outgoing = phone.waitForRequest(`**${endpoint}/cancel`);
    await panel.getByRole("button", { name: "Confirm cancellation" }).click();
    const submitted = await outgoing;
    await expect(phone.getByRole("status")).toHaveText("Your appointment has been cancelled.");
    const replay = await guest.request.post(`${endpoint}/cancel`, {
      headers: { "Idempotency-Key": submitted.headers()["idempotency-key"] },
      data: submitted.postDataJSON(),
    });
    expect(await replay.json()).toEqual({ status: "cancelled" });
    const revoked = await guest.request.post(endpoint, { data: { token } });
    expect(revoked.status()).toBe(404);
    expect(await revoked.json()).toMatchObject({ detail: "Booking management is unavailable" });
  } finally {
    await guest.close();
  }
});
