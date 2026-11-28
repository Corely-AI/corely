import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import type {
  EmployeeTaskList,
  ListWorkspacesOutput,
  StaffDirectoryEntry,
} from "@corely/contracts";
import { provisionTaskApps } from "./helpers/tasks-app-fixture";

test.beforeAll(() => {
  const web = new URL(process.env.OPENBUK_BASE_URL ?? "http://127.0.0.1:8080");
  const database = new URL(process.env.OPENBUK_TEST_DATABASE_URL ?? "postgresql://localhost");
  if (
    !["127.0.0.1", "localhost"].includes(web.hostname) ||
    !["127.0.0.1", "localhost"].includes(database.hostname) ||
    !/^\/openbuk_test_[a-z0-9_]+$/.test(database.pathname)
  ) {
    throw new Error(
      "Operational day acceptance requires loopback and a dedicated OpenBuk database"
    );
  }
});

test("opens a private studio and follows a public booking with manual staff work", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  const id = randomUUID();
  const studio = "Juniper Studio " + id.slice(0, 8);
  const email = "tasks-owner-" + id + "@example.test";
  const owner = "Test studio owner";
  await page.goto("/openbuk/signup?lang=en");
  await page.getByLabel("Your name", { exact: true }).fill(owner);
  await page.getByLabel("Studio name", { exact: true }).fill(studio);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Manual-local-day-test-2026!");
  await page.getByRole("button", { name: "Start free", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeVisible({
    timeout: 15_000,
  });

  await page.getByLabel("Studio name", { exact: true }).fill(studio);
  await page.getByLabel("Time zone", { exact: true }).fill("Europe/Berlin");
  await page.getByLabel("Service name", { exact: true }).fill("Test consultation");
  await page.getByLabel("Team member’s name", { exact: true }).fill("Avery Test");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved", { timeout: 15_000 });

  const token = await (
    await page.waitForFunction(() => localStorage.getItem("accessToken"))
  ).jsonValue();
  if (!token) {
    throw new Error("Synthetic sign-in did not return a bearer credential");
  }
  const ownerHeaders = { Authorization: "Bearer " + token };
  const workspaces = await page.request.get("/api/workspaces", { headers: ownerHeaders });
  expect(workspaces.ok()).toBe(true);
  const workspaceList: ListWorkspacesOutput = await workspaces.json();
  const privateStudio = workspaceList.workspaces[0];
  expect(workspaceList.workspaces).toHaveLength(1);
  expect(privateStudio.publicEnabled).toBe(false);
  const publicApi = "/api/w/" + privateStudio.slug + "/public/openbuk";
  expect((await page.request.get(publicApi + "/studio")).status()).toBe(404);

  const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()) as {
    tenantId: string;
    userId: string;
  };
  const installed = await provisionTaskApps(
    { ...claims, ownerEmail: email },
    { operationalOnly: true }
  );
  expect(installed).toEqual(expect.arrayContaining(["people", "tasks", "booking"]));
  const operationalApps = [
    "core",
    "platform",
    "workspaces",
    "parties",
    "people",
    "tasks",
    "booking",
  ];
  expect(installed.filter((app) => !operationalApps.includes(app))).toEqual([]);

  const scope = { ...ownerHeaders, "x-workspace-id": privateStudio.id };
  const profile = await page.request.post("/api/people/staff", {
    headers: { ...scope, "x-idempotency-key": randomUUID() },
    data: { displayName: "Avery Test" },
  });
  expect(profile.status()).toBe(201);
  const staff: StaffDirectoryEntry = await profile.json();

  const aiPaths: string[] = [];
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith("/api/copilot") || path.startsWith("/api/ai")) {
      aiPaths.push(path);
      return route.abort("failed");
    }
    return route.continue();
  });

  await page.goto("/openbuk/app/settings?lang=en");
  await page.getByLabel("Studio name", { exact: true }).fill(studio);
  await page.getByLabel("Time zone", { exact: true }).fill("Europe/Berlin");
  await page.getByLabel("Service name", { exact: true }).fill("Test consultation");
  await page.getByLabel("Team member’s name", { exact: true }).fill("Avery Test");
  await page.getByRole("button", { name: "Save & publish booking page" }).click();
  const publicLink = await page
    .getByRole("link", { name: "Open booking page" })
    .getAttribute("href");
  expect(publicLink).toBeTruthy();

  const visitor = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const nextMonday = new Date();
  nextMonday.setUTCDate(nextMonday.getUTCDate() + ((8 - nextMonday.getUTCDay()) % 7 || 7));
  const day = nextMonday.toISOString().slice(0, 10);
  try {
    const guest = await visitor.newPage();
    await guest.goto(publicLink!);
    await expect(guest.getByRole("heading", { name: "Test consultation" })).toBeVisible();
    await guest.getByLabel("Date · Europe/Berlin").fill(day);
    await guest
      .getByRole("button", { name: /09:00|9:00/ })
      .first()
      .click();
    await guest.getByLabel("Full name", { exact: true }).fill("Synthetic guest");
    await guest.getByLabel("Email", { exact: true }).fill("guest-" + id + "@example.test");
    await guest
      .getByRole("checkbox", {
        name: "I agree that the studio may use these details to manage my appointment.",
      })
      .check();
    await guest.getByRole("button", { name: /^Confirm booking/ }).click();
    await expect(guest.getByRole("heading", { name: "You’re booked in." })).toBeVisible();
  } finally {
    await visitor.close();
  }

  await page.goto("/openbuk/app/calendar?lang=en");
  await page.getByLabel("Date", { exact: true }).fill(day);
  await expect(page.getByRole("heading", { name: "Synthetic guest" })).toBeVisible();
  await page.getByRole("link", { name: "Daily Work", exact: true }).click();
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await page.getByLabel("Task title", { exact: true }).fill("Prepare the consultation kit");
  await page.getByRole("combobox", { name: "Owner", exact: true }).selectOption(staff.id);
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  const card = page.getByRole("article", { name: "Prepare the consultation kit", exact: true });
  const complete = card.getByRole("button", { name: "Complete", exact: true });
  await complete.focus();
  await page.keyboard.press("Enter");
  await expect(card.getByText("Completed", { exact: true })).toBeVisible();

  const list = await page.request.get("/api/tasks", { headers: scope });
  expect(list.ok()).toBe(true);
  const tasks: EmployeeTaskList = await list.json();
  expect(tasks.items).toEqual([
    expect.objectContaining({ status: "COMPLETED", ownerStaffId: staff.id, version: 2 }),
  ]);
  expect(aiPaths).toEqual([]);
});
