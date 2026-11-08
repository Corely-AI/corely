import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import type {
  ListWorkspacesOutput,
  StaffDirectoryEntry,
  StaffLifecycleView,
  StaffSelfView,
  CreateWorkspaceInviteOutput,
} from "@corely/contracts";
import { provisionTaskApps } from "./helpers/tasks-app-fixture";
import { seedStaffJourneyRecords } from "./helpers/staff-journey-fixture";

async function signup(page: Page, email: string) {
  await page.getByLabel("Your name", { exact: true }).fill("Anna Weber");
  await page.getByLabel("Studio name", { exact: true }).fill("Linden Studio");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("People-local-308-2026!");
  await page.getByRole("button", { name: "Start free", exact: true }).click();
}
async function auth(page: Page) {
  const token = await page.evaluate(() => localStorage.getItem("openbuk:access"));
  if (!token) throw new Error("Test authentication missing");
  return { Authorization: `Bearer ${token}` };
}

test("staff edit their own details, complete approved onboarding and lose current access after controlled departure", async ({
  page,
  browser,
  baseURL,
}, testInfo) => {
  test.setTimeout(120000);
  const adminUrl = process.env.TASKS_ADMIN_BASE_URL;
  if (!adminUrl || !["127.0.0.1", "localhost"].includes(new URL(adminUrl).hostname))
    throw new Error("Staff acceptance requires a local administration client");
  const run = randomUUID(),
    email = `tasks-owner-${run}@example.test`;
  await page.goto("/signup");
  await signup(page, email);
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeVisible();
  await page.getByLabel("Studio name", { exact: true }).fill("Linden Studio");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  const ownerHeaders = await auth(page);
  const { workspaces } = (await (
    await page.request.get("/api/workspaces", { headers: ownerHeaders })
  ).json()) as ListWorkspacesOutput;
  const workspace = workspaces[0],
    headers = { ...ownerHeaders, "x-workspace-id": workspace.id };
  const claims = JSON.parse(
    Buffer.from(ownerHeaders.Authorization.split(".")[1], "base64url").toString()
  ) as { tenantId: string; userId: string };
  await provisionTaskApps({ ...claims, ownerEmail: email });
  const records = await seedStaffJourneyRecords({
    ...claims,
    workspaceId: workspace.id,
    ownerEmail: email,
  });
  const created = await page.request.post("/api/people/staff", {
    headers: { ...headers, "x-idempotency-key": randomUUID() },
    data: {
      displayName: "Anna Weber",
      jobTitle: "Stylist",
      team: "Studio",
      resourceId: records.resourceId,
    },
  });
  expect(created.status()).toBe(201);
  const profile = (await created.json()) as StaffDirectoryEntry;
  const staffEmail = `tasks-staff-${run}@example.test`;
  const invitation = await page.request.post(
    `/api/workspaces/${workspace.id}/pilot-setup/invites`,
    { headers: ownerHeaders, data: { email: staffEmail } }
  );
  expect(invitation.status()).toBe(201);
  const { invite } = (await invitation.json()) as CreateWorkspaceInviteOutput;
  const staffContext = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } });
  const member = await staffContext.newPage();
  await member.goto(`/invite#${invite.token}`);
  await member.getByRole("link", { name: "Create your studio account" }).click();
  await signup(member, staffEmail);
  await member.getByRole("button", { name: "Accept invitation", exact: true }).click();
  await expect(
    member.getByRole("heading", { name: "Workspace membership is active" })
  ).toBeVisible();
  const staffHeaders = { ...(await auth(member)), "x-workspace-id": workspace.id };
  const staffClaims = JSON.parse(
    Buffer.from(staffHeaders.Authorization.split(".")[1], "base64url").toString()
  ) as { userId: string };
  const linked = await page.request.patch(`/api/people/staff/${profile.id}`, {
    headers: { ...headers, "x-idempotency-key": randomUUID() },
    data: {
      version: profile.version,
      displayName: profile.displayName,
      jobTitle: profile.jobTitle,
      team: profile.team,
      resourceId: profile.resourceId,
      accountId: staffClaims.userId,
    },
  });
  expect(linked.status(), await linked.text()).toBe(200);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const pattern = await page.request.post(`/api/people/staff/${profile.id}/availability`, {
    headers: { ...headers, "x-idempotency-key": randomUUID() },
    data: {
      version: 0,
      profileVersion: 2,
      pattern: {
        timezone: "Europe/Berlin",
        effectiveFrom: today,
        weeklyHours: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
          dayOfWeek,
          startTime: "09:00",
          endTime: "18:00",
        })),
        exceptions: [],
      },
    },
  });
  expect(pattern.status(), await pattern.text()).toBe(201);
  await member.goto("/app/me");
  await expect(
    member.getByText("No approved onboarding checklist is linked.", { exact: true })
  ).toBeVisible();
  await member.screenshot({
    path: testInfo.outputPath("self-onboarding-empty-mobile.png"),
    fullPage: true,
  });
  const tokens = await page.evaluate(() => ({
    access: localStorage.getItem("openbuk:access"),
    refresh: localStorage.getItem("openbuk:refresh"),
  }));
  const adminContext = await browser.newContext({
    baseURL: adminUrl,
    viewport: { width: 1440, height: 1000 },
  });
  await adminContext.addInitScript(
    ({ tokens, workspaceId }) => {
      if (tokens.access) localStorage.setItem("accessToken", tokens.access);
      if (tokens.refresh) localStorage.setItem("refreshToken", tokens.refresh);
      localStorage.setItem("corely-active-workspace", workspaceId);
    },
    { tokens, workspaceId: workspace.id }
  );
  const admin = await adminContext.newPage();
  await admin.goto(`/people/staff/${profile.id}`);
  await admin.getByRole("link", { name: /^Onboarding and departure/ }).click();
  await expect(admin.getByRole("heading", { name: "Onboarding and departure" })).toBeVisible();
  await admin.getByLabel("Checklist title", { exact: true }).fill("Welcome to Linden Studio");
  await admin.getByLabel("Step 1", { exact: true }).fill("Read the studio guide");
  await admin.getByRole("button", { name: "Add step", exact: true }).click();
  await admin.getByLabel("Step 2", { exact: true }).fill("Meet your manager");
  await admin.locator("main").evaluate((element) => element.scrollTo(0, 0));
  await admin.screenshot({
    path: testInfo.outputPath("onboarding-approval-desktop.png"),
    fullPage: true,
  });
  await admin.getByRole("button", { name: "Approve and assign checklist", exact: true }).click();
  await expect(
    admin.getByText("An onboarding checklist is already linked. Its history stays with the task.")
  ).toBeVisible();
  const bookingRequests: string[] = [];
  await member.route("**/api/openbuk/**", async (route) => {
    bookingRequests.push(route.request().url());
    await route.abort();
  });
  await member.goto("/app/me");
  await expect(
    member.getByRole("heading", { name: "Your staff profile", exact: true })
  ).toBeVisible();
  await expect(member.getByText("Welcome to Linden Studio", { exact: true })).toBeVisible();
  await expect(member.getByText("0/2 steps complete", { exact: true })).toBeVisible();
  await expect(member.getByText("Stylist", { exact: true })).toBeVisible();
  await member.getByText(`From ${today} · Europe/Berlin`, { exact: true }).click();
  await expect(member.getByText("Monday 09:00–18:00", { exact: true })).toBeVisible();
  await member.getByRole("button", { name: "Edit your details", exact: true }).click();
  await expect(member.getByLabel("Display name", { exact: true })).toBeFocused();
  await member.getByLabel("Personal email", { exact: true }).fill("anna-personal@example.test");
  await member.getByLabel("Personal phone", { exact: true }).fill("+49 555 0101");
  await expect(member.getByLabel("Job title", { exact: true })).toHaveCount(0);
  await member.screenshot({
    path: testInfo.outputPath("self-details-edit-mobile.png"),
    fullPage: true,
  });
  // An uncertain network response keeps the draft and retries the committed command.
  await member.route("**/api/people/me", async (route) => {
    if (route.request().method() === "PATCH") {
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await member.getByLabel("Personal phone", { exact: true }).press("Tab");
  await expect(
    member.getByRole("button", { name: "Save your details", exact: true })
  ).toBeFocused();
  await member.getByRole("button", { name: "Save your details", exact: true }).press("Enter");
  await expect(member.getByRole("alert")).toContainText("Your draft is kept");
  await expect(member.getByLabel("Personal email", { exact: true })).toHaveValue(
    "anna-personal@example.test"
  );
  await member.unroute("**/api/people/me");
  await member.getByRole("button", { name: "Save your details", exact: true }).click();
  await expect(member.getByRole("status")).toContainText("Saved.");
  await expect(member.getByText("anna-personal@example.test", { exact: true })).toBeVisible();
  const self = (await (
    await member.request.get("/api/people/me", { headers: staffHeaders })
  ).json()) as StaffSelfView;
  expect(Object.keys(self.profile)).not.toEqual(
    expect.arrayContaining(["accountId", "partyId", "notes"])
  );
  const escalation = await member.request.patch("/api/people/me", {
    headers: { ...staffHeaders, "x-idempotency-key": randomUUID() },
    data: {
      profileId: self.profile.id,
      version: self.profile.version,
      contactsVersion: self.contacts.version,
      displayName: "Anna",
      personalEmail: null,
      personalPhone: null,
      managerStaffId: profile.id,
    },
  });
  expect(escalation.status()).toBe(400);
  expect(
    (
      await member.request.get(`/api/people/staff/${profile.id}/private`, { headers: staffHeaders })
    ).status()
  ).toBe(403);
  await member.getByRole("link", { name: /^Open Daily Work/ }).click();
  const task = member.getByRole("article", { name: "Welcome to Linden Studio", exact: true });
  await expect(task.getByRole("button", { name: "Complete", exact: true })).toBeDisabled();
  await task.getByRole("checkbox", { name: "Read the studio guide", exact: true }).click();
  await expect(
    task.getByRole("checkbox", { name: "Read the studio guide", exact: true })
  ).toBeChecked();
  await task.getByRole("checkbox", { name: "Meet your manager", exact: true }).click();
  await expect(
    task.getByRole("checkbox", { name: "Meet your manager", exact: true })
  ).toBeChecked();
  await task.getByRole("button", { name: "Complete", exact: true }).click();
  await expect(task.getByText("Completed", { exact: true })).toBeVisible();
  await member.goto("/app/me");
  await expect(member.getByText("2/2 steps complete", { exact: true })).toBeVisible();
  await member.screenshot({
    path: testInfo.outputPath("self-onboarding-mobile-en.png"),
    fullPage: true,
  });
  await member.getByRole("combobox", { name: "Interface language" }).selectOption("de");
  await expect(
    member.getByRole("heading", { name: "Ihr Mitarbeiterprofil", exact: true })
  ).toBeVisible();
  expect(await member.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
    true
  );
  await member.screenshot({
    path: testInfo.outputPath("self-onboarding-mobile-de.png"),
    fullPage: true,
  });
  await member.getByRole("combobox", { name: "Sprache der Oberfläche" }).selectOption("vi");
  await expect(
    member.getByRole("heading", { name: "Hồ sơ nhân viên của bạn", exact: true })
  ).toBeVisible();
  expect(await member.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
    true
  );
  await member.screenshot({
    path: testInfo.outputPath("self-onboarding-mobile-vi.png"),
    fullPage: true,
  });
  await member.getByRole("combobox", { name: "Ngôn ngữ giao diện" }).selectOption("en");
  // Preserve a live staff draft while the actual owner disables workspace access.
  await member.getByRole("button", { name: "Edit your details", exact: true }).click();
  await member.getByLabel("Personal phone", { exact: true }).fill("+49 555 0199");
  const pendingTask = await page.request.post("/api/tasks", {
    headers: { ...headers, "x-idempotency-key": randomUUID() },
    data: { title: "Handover equipment", ownerStaffId: profile.id },
  });
  expect(pendingTask.status()).toBe(201);
  const pendingTaskId = ((await pendingTask.json()) as { id: string }).id;
  await admin.reload();
  await expect(admin.getByText("Handover equipment", { exact: true })).toBeVisible();
  await expect(
    admin.getByRole("heading", { name: "Future bookings and holds: 1", exact: true })
  ).toBeVisible();
  await expect(admin.getByText("customer-private@example.test", { exact: true })).toHaveCount(0);
  await admin.getByRole("button", { name: "Review departure", exact: true }).click();
  const disable = admin.getByRole("checkbox", {
    name: "Also disable this account’s access to this workspace",
    exact: true,
  });
  await expect(disable).not.toBeChecked();
  await disable.check();
  await admin.screenshot({
    path: testInfo.outputPath("departure-review-desktop.png"),
    fullPage: true,
  });
  await admin.getByRole("button", { name: "Confirm departure", exact: true }).click();
  await expect(
    admin.getByText("This profile is archived. Historical work remains traceable.")
  ).toBeVisible();
  await expect(admin.getByText("Disabled", { exact: true })).toBeVisible();
  const after = (await (
    await page.request.get(`/api/people/staff/${profile.id}/lifecycle`, { headers })
  ).json()) as StaffLifecycleView;
  expect(after.onboardingTask).toMatchObject({ id: self.onboardingTask?.id, status: "COMPLETED" });
  expect(after.tasks.openTasks).toEqual([
    expect.objectContaining({ id: pendingTaskId, ownerArchived: true, status: "OPEN" }),
  ]);
  expect(after.bookings).toEqual([expect.objectContaining({ id: records.bookingId })]);
  await member.getByRole("button", { name: "Save your details", exact: true }).click();
  await expect(member.getByRole("alert")).toContainText("Staff details are unavailable");
  await expect(member.getByLabel("Personal phone", { exact: true })).toHaveCount(0);
  await expect(member.getByText("anna-personal@example.test", { exact: true })).toHaveCount(0);
  for (const path of [
    "/people/me",
    "/tasks",
    `/documents/${records.documentId}/files/${records.fileId}/download-url`,
    `/documents/${records.documentId}/download`,
  ])
    expect((await member.request.get(`/api${path}`, { headers: staffHeaders })).status()).toBe(403);
  await member.screenshot({
    path: testInfo.outputPath("self-access-revoked-mobile.png"),
    fullPage: true,
  });
  expect(bookingRequests).toEqual([]);
  await admin.screenshot({
    path: testInfo.outputPath("departure-history-desktop.png"),
    fullPage: true,
  });
  await admin.setViewportSize({ width: 390, height: 844 });
  expect(await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await admin.screenshot({
    path: testInfo.outputPath("departure-history-mobile.png"),
    fullPage: true,
  });
  await staffContext.close();
  await adminContext.close();
});
