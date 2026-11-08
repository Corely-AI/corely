import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { provisionTaskApps } from "./helpers/tasks-app-fixture";
import type {
  ListWorkspacesOutput,
  StaffDirectoryEntry,
  ChecklistTemplateList,
  ChecklistTemplateView,
  EmployeeTaskList,
  CreateWorkspaceInviteOutput,
} from "@corely/contracts";
test.beforeAll(() => {
  if (
    !/^postgres(?:ql)?:\/\/[^/]+\/openbuk_test_[a-z0-9_]+(?:\?.*)?$/.test(
      process.env.OPENBUK_TEST_DATABASE_URL ?? ""
    )
  )
    throw new Error("Checklist acceptance requires a disposable openbuk_test_* database");
});
async function signup(page: Page, email: string) {
  await page.getByLabel("Your name", { exact: true }).fill("Anna Weber");
  await page.getByLabel("Studio name", { exact: true }).fill("Linden Studio");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Checklist-local-314-2026!");
  await page.getByRole("button", { name: "Start free", exact: true }).click();
}
async function auth(page: Page) {
  const token = await page.evaluate(() => localStorage.getItem("openbuk:access"));
  if (!token) throw new Error("Test authentication missing");
  return { Authorization: `Bearer ${token}` };
}
test("a manager publishes one recurring task, an assignee checks its steps and completes it without changing the template", async ({
  page,
  browser,
  baseURL,
}, testInfo) => {
  test.setTimeout(120000);
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
  const profileResponse = await page.request.post("/api/people/staff", {
    headers: { ...headers, "x-idempotency-key": randomUUID() },
    data: { displayName: "Anna Weber" },
  });
  expect(profileResponse.status()).toBe(201);
  const profile = (await profileResponse.json()) as StaffDirectoryEntry;
  const bookingRequests: string[] = [];
  await page.route("**/api/openbuk/**", async (route) => {
    bookingRequests.push(route.request().url());
    await route.abort();
  });
  await page.goto("/app/tasks");
  await page.getByRole("link", { name: "Recurring checklists", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No recurring checklists yet" })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("checklists-empty-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "New checklist", exact: true }).click();
  await expect(page.getByLabel("Checklist title", { exact: true })).toBeFocused();
  await page.getByLabel("Checklist title", { exact: true }).fill("Opening routine");
  await page.getByLabel("Timezone", { exact: true }).fill("Europe/Berlin");
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  await page.getByLabel("Starts on", { exact: true }).fill(today);
  await page.getByRole("checkbox", { name: "Anna Weber", exact: true }).check();
  await page.getByLabel("Step 1", { exact: true }).fill("Unlock reception");
  await page.getByRole("button", { name: "Add step", exact: true }).click();
  await page.getByLabel("Step 2", { exact: true }).fill("Check equipment");
  await page.screenshot({
    path: testInfo.outputPath("checklists-publish-desktop.png"),
    fullPage: true,
  });
  const timezone = page.getByLabel("Timezone", { exact: true });
  await timezone.fill("");
  await expect(page.getByLabel("Checklist title", { exact: true })).toHaveValue("Opening routine");
  await timezone.pressSequentially("Europe/");
  await expect(timezone).toBeFocused();
  await page.getByRole("button", { name: "Publish checklist", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Check the title, timezone");
  await expect(page.getByLabel("Starts on", { exact: true })).toHaveValue(today);
  await expect(page.getByLabel("Step 2", { exact: true })).toHaveValue("Check equipment");
  await expect(page.getByRole("checkbox", { name: "Anna Weber", exact: true })).toBeChecked();
  await page.screenshot({
    path: testInfo.outputPath("checklist-timezone-validation-desktop.png"),
    fullPage: true,
  });
  await timezone.fill("");
  await timezone.pressSequentially("Europe/Berlin");
  await page.route("**/api/tasks/recurring", async (route) => {
    if (route.request().method() === "POST") {
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Publish checklist", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Your changes are kept");
  await page.unroute("**/api/tasks/recurring");
  await page.getByRole("button", { name: "Publish checklist", exact: true }).click();
  await expect(page.getByLabel("Checklist title", { exact: true })).toHaveCount(0);
  const templateCard = page.getByRole("article", { name: "Opening routine", exact: true });
  await expect(templateCard).toBeVisible();
  const list = (await (
    await page.request.get("/api/tasks/recurring", { headers })
  ).json()) as ChecklistTemplateList;
  expect(list.items).toHaveLength(1);
  const template = list.items[0];
  await templateCard.getByRole("button", { name: "Generate today", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Checklist saved");
  const responses = await Promise.all(
    Array.from({ length: 12 }, () =>
      page.request.post(`/api/tasks/recurring/${template.id}/generate`, {
        headers: { ...headers, "x-idempotency-key": randomUUID() },
        data: { version: 1 },
      })
    )
  );
  expect(responses.every((r) => r.status() === 201)).toBe(true);
  const generated = (await responses[0].json()) as ChecklistTemplateView;
  expect(generated.occurrences[0].taskIds).toHaveLength(1);
  const taskId = generated.occurrences[0].taskIds[0];
  await templateCard.getByText("Recent occurrences", { exact: true }).click();
  await page.screenshot({
    path: testInfo.outputPath("checklists-generated-desktop.png"),
    fullPage: true,
  });
  // A stale editor retains its draft; a later reload uses the current version.
  await templateCard.getByRole("button", { name: "Edit future schedule", exact: true }).click();
  await page.getByLabel("Checklist title", { exact: true }).fill("Closing routine");
  const pausedResponse = await page.request.post(`/api/tasks/recurring/${template.id}/pause`, {
    headers: { ...headers, "x-idempotency-key": randomUUID() },
    data: { version: 1 },
  });
  expect(pausedResponse.status()).toBe(201);
  await page.getByRole("button", { name: "Publish changes", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("This checklist changed");
  await expect(page.getByLabel("Checklist title", { exact: true })).toHaveValue("Closing routine");
  await page.screenshot({
    path: testInfo.outputPath("checklists-conflict-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Reload latest", exact: true }).click();
  await templateCard.getByRole("button", { name: "Resume tomorrow", exact: true }).click();
  await expect(templateCard.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("combobox", { name: "Interface language" }).selectOption("de");
  await expect(
    page.getByRole("heading", { name: "Wiederkehrende Checklisten", exact: true })
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  );
  await page.screenshot({ path: testInfo.outputPath("checklists-mobile-de.png"), fullPage: true });
  await page.getByRole("combobox", { name: "Sprache der Oberfläche" }).selectOption("vi");
  await expect(
    page.getByRole("heading", { name: "Danh sách kiểm tra định kỳ", exact: true })
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  );
  await page.screenshot({ path: testInfo.outputPath("checklists-mobile-vi.png"), fullPage: true });
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
  const staffHeaders = await auth(member);
  const staffClaims = JSON.parse(
    Buffer.from(staffHeaders.Authorization.split(".")[1], "base64url").toString()
  ) as { userId: string };
  expect(
    (
      await page.request.patch(`/api/people/staff/${profile.id}`, {
        headers: { ...headers, "x-idempotency-key": randomUUID() },
        data: { displayName: profile.displayName, accountId: staffClaims.userId, version: 1 },
      })
    ).status()
  ).toBe(200);
  const beforeCompletion = (await (
    await page.request.get(`/api/tasks/recurring/${template.id}`, { headers })
  ).json()) as ChecklistTemplateView;
  await member.goto("/app/tasks");
  const taskCard = member.getByRole("article", { name: "Opening routine", exact: true });
  await expect(taskCard).toBeVisible();
  await expect(taskCard.getByRole("button", { name: "Complete", exact: true })).toBeDisabled();
  await expect(member.getByRole("link", { name: "Recurring checklists", exact: true })).toHaveCount(
    0
  );
  const first = taskCard.getByRole("checkbox", { name: "Unlock reception", exact: true });
  await first.focus();
  await member.keyboard.press("Space");
  await expect(first).toBeChecked();
  await expect(first).toBeFocused();
  await expect(taskCard.getByRole("button", { name: "Complete", exact: true })).toBeDisabled();
  await taskCard.getByRole("checkbox", { name: "Check equipment", exact: true }).click();
  await expect(
    taskCard.getByRole("checkbox", { name: "Check equipment", exact: true })
  ).toBeChecked();
  await expect(taskCard.getByRole("button", { name: "Complete", exact: true })).toBeEnabled();
  await member.screenshot({
    path: testInfo.outputPath("checklist-progress-staff-mobile.png"),
    fullPage: true,
  });
  await taskCard.getByRole("button", { name: "Complete", exact: true }).click();
  await expect(taskCard.getByText("Completed", { exact: true })).toBeVisible();
  const tasks = (await (
    await page.request.get("/api/tasks", { headers })
  ).json()) as EmployeeTaskList;
  expect(tasks.items).toHaveLength(1);
  expect(tasks.items[0]).toMatchObject({ id: taskId, status: "COMPLETED" });
  const afterCompletion = (await (
    await page.request.get(`/api/tasks/recurring/${template.id}`, { headers })
  ).json()) as ChecklistTemplateView;
  expect(afterCompletion).toEqual(beforeCompletion);
  await member.goto("/app/tasks/templates");
  await expect(member.getByRole("alert")).toContainText("Checklist management is unavailable");
  await member.screenshot({
    path: testInfo.outputPath("checklists-denied-staff-mobile.png"),
    fullPage: true,
  });
  await staffContext.close();
  const adminUrl = process.env.TASKS_ADMIN_BASE_URL;
  if (adminUrl) {
    if (!["127.0.0.1", "localhost"].includes(new URL(adminUrl).hostname))
      throw new Error("Cross-surface verification uses a local test client");
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
    await admin.goto("/tasks/templates");
    await expect(
      admin.getByRole("article", { name: "Opening routine", exact: true })
    ).toBeVisible();
    await admin.screenshot({
      path: testInfo.outputPath("checklists-admin-desktop.png"),
      fullPage: true,
    });
    await admin.goto("/tasks");
    const sameTask = admin.getByRole("article", { name: "Opening routine", exact: true });
    await expect(sameTask.getByText("Completed", { exact: true })).toBeVisible();
    await expect(
      sameTask.getByRole("checkbox", { name: "Unlock reception", exact: true })
    ).toBeChecked();
    await admin.screenshot({
      path: testInfo.outputPath("checklist-admin-completed-desktop.png"),
      fullPage: true,
    });
    await adminContext.close();
  }
  expect(
    (await page.request.post("/api/internal/background/tasks/recurring/run", { data: {} })).status()
  ).toBe(401);
  expect(bookingRequests).toEqual([]);
});

test("the credentialed existing background runtime generates the same occurrence across parallel runners", async ({
  page,
}) => {
  const serviceToken = process.env.TASKS_RECURRING_SERVICE_TOKEN;
  if (!serviceToken)
    throw new Error("Set the local API's configured TASKS_RECURRING_SERVICE_TOKEN for acceptance");
  const run = randomUUID(),
    email = `tasks-owner-${run}@example.test`;
  await page.goto("/signup");
  await signup(page, email);
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeVisible();
  await page.getByLabel("Studio name", { exact: true }).fill("Linden Studio");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  const ownerHeaders = await auth(page);
  const claims = JSON.parse(
    Buffer.from(ownerHeaders.Authorization.split(".")[1], "base64url").toString()
  ) as { tenantId: string; userId: string };
  await provisionTaskApps({ ...claims, ownerEmail: email });
  const { workspaces } = (await (
    await page.request.get("/api/workspaces", { headers: ownerHeaders })
  ).json()) as ListWorkspacesOutput;
  const headers = { ...ownerHeaders, "x-workspace-id": workspaces[0].id };
  const profile = (await (
    await page.request.post("/api/people/staff", {
      headers: { ...headers, "x-idempotency-key": randomUUID() },
      data: { displayName: "Anna Weber" },
    })
  ).json()) as StaffDirectoryEntry;
  const published = await page.request.post("/api/tasks/recurring", {
    headers: { ...headers, "x-idempotency-key": randomUUID() },
    data: {
      title: "Closing routine",
      timezone: "UTC",
      effectiveFrom: new Date().toISOString().slice(0, 10),
      effectiveUntil: null,
      dueTime: "18:00",
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      assigneeIds: [profile.id],
      steps: [{ id: randomUUID(), title: "Lock reception" }],
    },
  });
  expect(published.status()).toBe(201);
  const template = (await published.json()) as ChecklistTemplateView;
  const responses = await Promise.all(
    Array.from({ length: 3 }, () =>
      page.request.post("/api/internal/background/tasks/recurring/run", {
        headers: { "x-service-token": serviceToken },
        data: { limit: 25 },
      })
    )
  );
  expect(responses.every((r) => r.status() === 201)).toBe(true);
  for (const response of responses)
    expect(((await response.json()) as { errorCount: number }).errorCount).toBe(0);
  const tasks = (await (
    await page.request.get("/api/tasks", { headers })
  ).json()) as EmployeeTaskList;
  expect(tasks.items).toHaveLength(1);
  expect(tasks.items[0].recurrence?.templateId).toBe(template.id);
  const manual = await page.request.post(`/api/tasks/recurring/${template.id}/generate`, {
    headers: { ...headers, "x-idempotency-key": randomUUID() },
    data: { version: 1 },
  });
  expect(manual.status()).toBe(201);
  expect(((await manual.json()) as ChecklistTemplateView).occurrences[0].taskIds).toEqual([
    tasks.items[0].id,
  ]);
});
