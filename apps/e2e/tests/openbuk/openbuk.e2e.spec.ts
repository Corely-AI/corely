import { test, expect } from "@playwright/test";

// Requires a running OpenBuk frontend and Corely API on a disposable local DB.
// No test-harness auth bypass, mocked responses or external email/payment calls.
test("studio signup → setup → anonymous booking → appointment in studio", async ({
  page,
  browser,
}) => {
  const suffix = Date.now().toString();
  await page.goto("/signup");
  await page.getByLabel("Your name", { exact: true }).fill("OpenBuk Test Owner");
  await page.getByLabel("Studio name", { exact: true }).fill(`OpenBuk Test ${suffix}`);
  await page.getByLabel("Email", { exact: true }).fill(`openbuk-${suffix}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill("OpenBuk-local-test-2026!");
  await page.getByRole("button", { name: "Start free", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Let’s make room for your first booking." })
  ).toBeVisible();
  await page.getByLabel("Studio name", { exact: true }).fill(`OpenBuk Test ${suffix}`);
  await page.getByLabel("Time zone", { exact: true }).fill("Europe/Berlin");
  await page.getByLabel("Service name", { exact: true }).fill("Gel manicure");
  await page.getByLabel("Team member’s name", { exact: true }).fill("Anna");
  await page.getByRole("combobox", { name: "Booking language", exact: true }).selectOption("vi");
  await page.getByRole("button", { name: "Save & publish booking page" }).click();
  await expect(page.getByText("Your booking page is ready", { exact: true })).toBeVisible();
  const url = await page.getByRole("link", { name: "Open booking page" }).getAttribute("href");
  expect(url).toBeTruthy();

  const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const guest = await guestContext.newPage();
  await guest.goto(url!);
  await expect(guest.getByRole("heading", { name: "Gel manicure" })).toBeVisible();
  await expect(guest.getByRole("heading", { name: "Chọn thời gian dành cho bạn." })).toBeVisible();
  await expect(guest.locator("html")).toHaveAttribute("lang", "vi");
  await guest.getByLabel("Ngôn ngữ giao diện").selectOption("de");
  await expect(guest.getByRole("heading", { name: "Finde Zeit für dich." })).toBeVisible();
  await guest.reload();
  await expect(guest.locator("html")).toHaveAttribute("lang", "de");
  await guest.getByLabel("Sprache der Oberfläche").selectOption("en");
  await expect(guest.getByRole("heading", { name: "Find a time for yourself." })).toBeVisible();
  // Next Monday, safely after the minimum notice period.
  const nextMonday = new Date();
  nextMonday.setUTCDate(nextMonday.getUTCDate() + ((8 - nextMonday.getUTCDay()) % 7 || 7));
  const day = nextMonday.toISOString().slice(0, 10);
  await guest.getByLabel("Date · Europe/Berlin").fill(day);
  const slot = guest.getByRole("button", { name: /09:00|9:00/ }).first();
  await slot.click();
  await guest.getByLabel("Full name", { exact: true }).fill("OpenBuk Guest");
  await guest.getByLabel("Email", { exact: true }).fill("guest@example.test");
  await guest.getByRole("checkbox").check();
  const responsePromise = guest.waitForResponse(
    (r) => r.url().endsWith("/public/openbuk/bookings") && r.request().method() === "POST"
  );
  await guest.getByRole("button", { name: "Confirm booking" }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  await expect(guest.getByRole("heading", { name: "You’re booked in." })).toBeVisible();
  await expect(guest.getByText("Booking reference", { exact: true })).toBeVisible();

  const slug = new URL(url!).pathname.split("/").at(-1)!;
  const legacy = await guest.request.get(
    new URL(`/api/w/${slug}/public/booking/pages/${slug}`, url!).toString()
  );
  expect(legacy.status()).toBe(404);

  const repeated = await guest.request.post(response.url(), {
    data: response.request().postDataJSON(),
    headers: { "Idempotency-Key": response.request().headers()["idempotency-key"] },
  });
  expect(repeated.status()).toBe(201);
  expect(await repeated.json()).toEqual(await response.json());

  await page.getByLabel("Date", { exact: true }).fill(day);
  await expect(page.getByRole("heading", { name: "OpenBuk Guest", exact: true })).toBeVisible();
  await page.reload();
  await page.getByLabel("Date", { exact: true }).fill(day);
  await expect(page.getByRole("heading", { name: "OpenBuk Guest", exact: true })).toBeVisible();
  await guestContext.close();
});
