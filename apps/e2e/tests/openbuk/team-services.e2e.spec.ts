import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test.beforeAll(() => {
  const web = new URL(process.env.OPENBUK_BASE_URL ?? "http://127.0.0.1:8080");
  const db = new URL(process.env.OPENBUK_TEST_DATABASE_URL ?? "postgresql://localhost");
  if (
    !["127.0.0.1", "localhost"].includes(web.hostname) ||
    !["127.0.0.1", "localhost"].includes(db.hostname) ||
    !/^\/openbuk_test_[a-z0-9_]+$/.test(db.pathname)
  ) {
    throw new Error(
      "Team booking acceptance requires local servers and a disposable OpenBuk database"
    );
  }
});

test("a manager configures staff eligibility and archives a service with an upcoming appointment", async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(90_000);
  const name = `Team booking ${randomUUID().slice(0, 8)}`;
  await page.goto("/openbuk/signup?lang=en");
  await page.getByLabel("Your name", { exact: true }).fill("Test manager");
  await page.getByLabel("Studio name", { exact: true }).fill(name);
  await page.getByLabel("Email", { exact: true }).fill(`team-${randomUUID()}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill("OpenBuk-local-test-2026!");
  await page.getByRole("button", { name: "Start free", exact: true }).click();
  // The embedded Backoffice shell expects an existing workspace. Use the real
  // pilot start API to provision the synthetic studio before entering Settings.
  const token = await (
    await page.waitForFunction(() => localStorage.getItem("accessToken"))
  ).jsonValue();
  const started = await page.request.post("/api/workspaces/pilot-setup/start", {
    headers: { Authorization: `Bearer ${token}` },
    data: { name, countryCode: "DE", currency: "EUR" },
  });
  expect(started.ok()).toBe(true);
  await page.goto("/openbuk/app/settings?lang=en");
  await expect(
    page.getByRole("heading", { name: "Let’s make room for your first booking." })
  ).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Studio name", { exact: true }).fill(name);
  await page.getByLabel("Time zone", { exact: true }).fill("Europe/Berlin");
  await page.getByLabel("Service name", { exact: true }).fill("Gel manicure");
  await page.getByLabel("Team member’s name", { exact: true }).fill("Anna");
  await page.getByRole("button", { name: "Save & publish booking page" }).click();
  const publicUrl = await page
    .getByRole("link", { name: "Open booking page" })
    .getAttribute("href");
  expect(publicUrl).toBeTruthy();

  await page.getByRole("link", { name: "Studio settings", exact: true }).click();
  const team = page.getByRole("region", { name: "Team and services" });
  await expect(team.getByRole("button", { name: "Add staff member" })).toBeVisible({
    timeout: 15_000,
  });
  await team.getByRole("button", { name: "Add staff member" }).click();
  await team
    .getByRole("group", { name: "Team member’s name", exact: true })
    .getByLabel("Team member’s name")
    .fill("Sofia");
  await team.getByRole("group", { name: "Gel manicure" }).getByLabel("Sofia").check();
  await team.getByRole("button", { name: "Add service", exact: true }).click();
  await team
    .getByRole("group", { name: "Service name", exact: true })
    .getByLabel("Service name")
    .fill("Consultation");
  const service = team.getByRole("group", { name: "Consultation", exact: true });
  await service.getByLabel("Duration (minutes)").fill("30");
  await service.getByLabel("Price (studio currency)").fill("25");
  await team.getByRole("button", { name: "Save team and services" }).click();
  await expect(team.getByRole("alert")).toContainText("select eligible staff");
  await service.getByLabel("Sofia").check();
  await team.getByRole("button", { name: "Save team and services" }).click();
  await expect(team.getByRole("status")).toHaveText("Team and services saved.");
  await service.screenshot({ path: testInfo.outputPath("team-settings-desktop.png") });

  const guestContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const guest = await guestContext.newPage();
  try {
    await guest.goto(publicUrl!);
    expect((await guest.request.get("/api/openbuk/team")).status()).toBe(401);
    await expect(guest.getByRole("combobox", { name: "Team member" }).locator("option")).toHaveText(
      ["Anna", "Sofia"]
    );
    await guest
      .getByRole("combobox", { name: "Service", exact: true })
      .selectOption({ label: "Consultation" });
    await expect(guest.getByRole("combobox", { name: "Team member" })).toHaveCount(0);
    await expect(guest.getByText("30 min · With Sofia")).toBeVisible();
    const monday = new Date();
    monday.setUTCDate(monday.getUTCDate() + ((8 - monday.getUTCDay()) % 7 || 7));
    const day = monday.toISOString().slice(0, 10);
    await guest.getByLabel("Date · Europe/Berlin").fill(day);
    const slot = guest.getByRole("button", { name: /09:00|9:00/ }).first();
    await expect(slot).toBeVisible();
    expect(
      await guest.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true);
    await guest.screenshot({
      path: testInfo.outputPath("guest-service-mobile.png"),
      fullPage: true,
    });
    await slot.click();
    await guest.getByLabel("Full name", { exact: true }).fill("Test guest");
    await guest.getByLabel("Email", { exact: true }).fill("guest@example.test");
    await guest.locator('input[name="consentAccepted"]').check();
    await expect(
      guest.getByRole("checkbox", {
        name: "Email me a booking confirmation (optional)",
      })
    ).not.toBeChecked();
    const submittedBooking = guest.waitForRequest(
      (request) => request.method() === "POST" && request.url().endsWith("/public/openbuk/bookings")
    );
    await guest.getByRole("button", { name: "Confirm booking" }).click();
    expect((await submittedBooking).postDataJSON()).not.toHaveProperty(
      "confirmationEmailRequested"
    );
    await expect(guest.getByRole("heading", { name: "You’re booked in." })).toBeVisible();

    await page.reload();
    await expect(service.getByText("Upcoming appointments: 1")).toBeVisible({ timeout: 15_000 });
    await service.getByLabel("Accept new bookings").uncheck();
    await team.getByRole("button", { name: "Save team and services" }).click();
    await expect(team.getByRole("status")).toHaveText("Team and services saved.");
    await expect(service.getByText("Upcoming appointments: 1")).toBeVisible();
    await service.screenshot({ path: testInfo.outputPath("archived-service-desktop.png") });
    await guest.reload();
    await expect(guest.getByRole("heading", { name: "Gel manicure" })).toBeVisible();
    await expect(guest.getByRole("combobox", { name: "Service", exact: true })).toHaveCount(0);
    await page.goto("/openbuk/app/calendar");
    await page.getByLabel("Date", { exact: true }).fill(day);
    await expect(page.getByRole("heading", { name: "Test guest" })).toBeVisible();
    await expect(page.getByText(/Consultation.*Sofia/)).toBeVisible();
  } finally {
    await guestContext.close();
  }
});
