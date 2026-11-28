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
    throw new Error("Agenda acceptance requires disposable local OpenBuk services");
  }
});

test("reviews a move and cancellation and preserves the booking draft after a real slot conflict", async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const studio = `Agenda studio ${randomUUID().slice(0, 8)}`;
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/openbuk/signup?lang=en");
  await page.getByLabel("Your name", { exact: true }).fill("Agenda manager");
  await page.getByLabel("Studio name", { exact: true }).fill(studio);
  await page.getByLabel("Email", { exact: true }).fill(`schedule-${randomUUID()}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill("OpenBuk-Agenda-Test-2026!");
  await page.getByRole("button", { name: "Start free", exact: true }).click();
  const token = await (
    await page.waitForFunction(() => localStorage.getItem("accessToken"))
  ).jsonValue();
  expect(
    (
      await page.request.post("/api/workspaces/pilot-setup/start", {
        headers: { Authorization: `Bearer ${token}` },
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
  const publicUrl = await page
    .getByRole("link", { name: "Open booking page" })
    .getAttribute("href");
  expect(publicUrl).toBeTruthy();
  const slug = new URL(publicUrl!, page.url()).pathname.split("/").at(-1);

  const future = new Date();
  future.setUTCDate(future.getUTCDate() + ((8 - future.getUTCDay()) % 7 || 7));
  const day = future.toISOString().slice(0, 10);
  await page.getByLabel("Date", { exact: true }).fill(day);
  await page.getByRole("button", { name: "New appointment", exact: true }).click();
  const editor = page.getByRole("form", { name: "New appointment" });
  const times = editor.getByRole("combobox", { name: "Available times", exact: true });
  await expect(times).toBeEnabled({ timeout: 15_000 });
  await times.selectOption({ index: 1 });
  const takenTime = await times.inputValue();
  await editor.getByLabel("Full name", { exact: true }).fill("Agenda guest");
  await editor.getByLabel("Email", { exact: true }).fill("agenda-guest@example.test");
  const serviceId = await page.getByRole("combobox", { name: "Service", exact: true }).inputValue();
  const staffId = await page
    .getByRole("combobox", { name: "Team member", exact: true })
    .inputValue();

  const competitor = await page.request.post(`/api/w/${slug}/public/openbuk/bookings`, {
    headers: { "Idempotency-Key": randomUUID() },
    data: {
      serviceId,
      staffId,
      startAt: takenTime,
      customer: { name: "Concurrent guest", email: "peer@example.test" },
      consentAccepted: true,
    },
  });
  expect(competitor.status()).toBe(201);
  await editor.getByRole("button", { name: "Confirm booking", exact: true }).click();
  await expect(editor.getByRole("alert")).toContainText("Your draft is still here");
  await expect(editor.getByLabel("Full name", { exact: true })).toHaveValue("Agenda guest");
  await expect(editor.getByLabel("Email", { exact: true })).toHaveValue(
    "agenda-guest@example.test"
  );
  await expect(times.locator(`option[value="${takenTime}"]`)).toHaveCount(0);
  await editor.screenshot({ path: testInfo.outputPath("agenda-conflict-desktop.png") });
  await times.selectOption({ index: 1 });
  const firstTime = await times.inputValue();
  await editor.getByRole("button", { name: "Confirm booking", exact: true }).click();

  const appointment = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "Agenda guest", exact: true }) });
  await expect(appointment).toContainText("Confirmed");
  await page.getByRole("button", { name: "Week", exact: true }).click();
  await expect(page.getByRole("button", { name: "Week", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await expect(page.locator(".agenda-day")).toHaveCount(7);
  await expect(page.getByText("Available times · Dora", { exact: false }).first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("agenda-week-desktop.png") });

  const move = appointment.getByRole("button", { name: "Move appointment" });
  const appointmentStart = appointment.locator(".appointment-time strong");
  const earlier = await appointmentStart.textContent();
  await move.focus();
  await page.keyboard.press("Enter");
  const moveForm = page.getByRole("form", { name: "Move appointment" });
  const moveTimes = moveForm.getByRole("combobox", { name: "Available times", exact: true });
  await expect(moveTimes).toBeEnabled({ timeout: 15_000 });
  await moveTimes.selectOption({ index: 1 });
  expect(await moveTimes.inputValue()).not.toBe(firstTime);
  await moveForm.getByRole("button", { name: "Review change" }).click();
  await expect(moveForm.getByText("Current time", { exact: true })).toBeVisible();
  await expect(moveForm.getByText("New time", { exact: true })).toBeVisible();
  await moveForm.getByRole("button", { name: "Confirm move" }).click();
  await expect(moveForm).toHaveCount(0);
  await expect(appointment).toContainText("Confirmed");
  await expect(appointmentStart).not.toHaveText(earlier ?? "");

  const mobile = await browser.newContext({
    storageState: await page.context().storageState(),
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  try {
    const phone = await mobile.newPage();
    await phone.goto("/openbuk/app?lang=en");
    await phone.getByLabel("Date", { exact: true }).fill(day);
    const record = phone
      .getByRole("article")
      .filter({ has: phone.getByRole("heading", { name: "Agenda guest", exact: true }) });
    await record.getByRole("button", { name: "Cancel appointment" }).click();
    const cancellation = phone.getByRole("region", { name: "Cancel appointment" });
    await expect(cancellation).toContainText("Cancelling frees this time");
    expect(
      await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true);
    await cancellation.screenshot({ path: testInfo.outputPath("agenda-cancel-mobile.png") });
    await cancellation.getByRole("button", { name: "Confirm cancellation" }).click();
    await expect(record).toContainText("Cancelled");
  } finally {
    await mobile.close();
  }

  const anonymous = await browser.newContext();
  try {
    const denied = await anonymous.request.get(`/api/openbuk/agenda?day=${day}`);
    expect(denied.status()).toBe(401);
  } finally {
    await anonymous.close();
  }
  const workspaceId = await page.evaluate(() => localStorage.getItem("corely-active-workspace"));
  const agenda = await page.request.get(`/api/openbuk/agenda?day=${day}`, {
    headers: { Authorization: `Bearer ${token}`, "X-Workspace-Id": workspaceId ?? "" },
  });
  expect(agenda.ok()).toBe(true);
  expect(await agenda.text()).not.toContain("agenda-guest@example.test");
  const unknownWorkspace = await page.request.get(`/api/openbuk/agenda?day=${day}`, {
    headers: { Authorization: `Bearer ${token}`, "X-Workspace-Id": randomUUID() },
  });
  expect([400, 403, 404]).toContain(unknownWorkspace.status());
  expect(await unknownWorkspace.text()).not.toContain("Agenda guest");
});
