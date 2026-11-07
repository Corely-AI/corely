import { test, expect, type Page } from "@playwright/test";
import { provisionTaskApps } from "./helpers/tasks-app-fixture";
import { randomUUID } from "node:crypto";
import type {
  CreateWorkspaceInviteOutput,
  EmployeeTaskList,
  ListWorkspacesOutput,
  StaffDirectoryEntry,
} from "@corely/contracts";

test.beforeAll(() => {
  if (
    !/^postgres(?:ql)?:\/\/[^/]+\/openbuk_test_[a-z0-9_]+(?:\?.*)?$/.test(
      process.env.OPENBUK_TEST_DATABASE_URL ?? ""
    )
  ) {
    throw new Error("Daily Work acceptance requires a disposable openbuk_test_* database");
  }
});
async function headers(page: Page) {
  const token = await page.evaluate(() => localStorage.getItem("openbuk:access"));
  if (!token) throw new Error("Test authentication missing");
  return { Authorization: `Bearer ${token}` };
}
async function signup(page: Page, email: string) {
  await page.getByLabel("Your name", { exact: true }).fill("Anna Weber");
  await page.getByLabel("Studio name", { exact: true }).fill("Linden Studio");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Tasks-local-312-2026!");
  await page.getByRole("button", { name: "Start free", exact: true }).click();
}

test("Daily Work creates, assigns, completes and reopens one task, including stale edits and staff access", async ({
  page,
  browser,
  baseURL,
}, testInfo) => {
  const run = randomUUID();
  await page.goto("/signup");
  await signup(page, `tasks-owner-${run}@example.test`);
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeVisible();
  await page.getByLabel("Studio name", { exact: true }).fill("Linden Studio");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  const ownerHeaders = await headers(page);
  const workspaceResponse = await page.request.get("/api/workspaces", { headers: ownerHeaders });
  const workspace = ((await workspaceResponse.json()) as ListWorkspacesOutput).workspaces[0];
  const scopeHeaders = { ...ownerHeaders, "x-workspace-id": workspace.id };
  await page.goto("/app/tasks");
  await expect(page.getByRole("alert")).toContainText("Daily Work is unavailable");
  await page.screenshot({
    path: testInfo.outputPath("tasks-disabled-desktop.png"),
    fullPage: true,
  });
  const ownerClaims = JSON.parse(
    Buffer.from(ownerHeaders.Authorization.split(".")[1], "base64url").toString()
  ) as { tenantId: string; userId: string };
  await provisionTaskApps({ ...ownerClaims, ownerEmail: `tasks-owner-${run}@example.test` });
  const profileResponse = await page.request.post("/api/people/staff", {
    headers: { ...scopeHeaders, "x-idempotency-key": randomUUID() },
    data: { displayName: "Anna Weber" },
  });
  expect(profileResponse.status()).toBe(201);
  const profile = (await profileResponse.json()) as StaffDirectoryEntry;
  await page.reload();
  await expect(page.getByRole("heading", { name: "No tasks here yet" })).toBeVisible();
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await expect(page.getByLabel("Task title", { exact: true })).toBeFocused();
  await page.getByLabel("Task title", { exact: true }).fill("Prepare reception for opening");
  await page.getByRole("combobox", { name: "Owner" }).selectOption(profile.id);
  await page.getByLabel("Due time (optional)", { exact: true }).fill("2026-11-09T09:30");
  await page.screenshot({ path: testInfo.outputPath("tasks-create-desktop.png"), fullPage: true });
  // The write commits but its response is lost. Retrying must reuse the command key.
  await page.route("**/api/tasks", async (route) => {
    if (route.request().method() === "POST") {
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Your changes are kept");
  await expect(page.getByLabel("Task title", { exact: true })).toHaveValue(
    "Prepare reception for opening"
  );
  await page.unroute("**/api/tasks");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  const card = page.getByRole("article", { name: "Prepare reception for opening", exact: true });
  await expect(card).toBeVisible();
  const list = (await (
    await page.request.get("/api/tasks", { headers: scopeHeaders })
  ).json()) as EmployeeTaskList;
  expect(list.items).toHaveLength(1);
  let task = list.items[0];
  // Editing other fields preserves precision beyond the datetime-local minute input.
  const preciseDueAt = new Date(new Date(task.dueAt ?? "").getTime() + 45123).toISOString();
  expect(
    (
      await page.request.patch(`/api/tasks/${task.id}`, {
        headers: { ...scopeHeaders, "x-idempotency-key": randomUUID() },
        data: {
          title: task.title,
          ownerStaffId: profile.id,
          dueAt: preciseDueAt,
          version: task.version,
        },
      })
    ).status()
  ).toBe(200);
  await page.reload();
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(page.getByLabel("Task title", { exact: true })).toHaveCount(0);
  await expect(card).toBeVisible();
  task = await (await page.request.get(`/api/tasks/${task.id}`, { headers: scopeHeaders })).json();
  expect(task.dueAt).toBe(preciseDueAt);
  expect(task.version).toBe(3);
  await card.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Task title", { exact: true }).fill("Unsaved local edit");
  expect(
    (
      await page.request.patch(`/api/tasks/${task.id}`, {
        headers: { ...scopeHeaders, "x-idempotency-key": randomUUID() },
        data: {
          title: "Prepare reception for opening",
          ownerStaffId: profile.id,
          dueAt: task.dueAt,
          version: task.version,
        },
      })
    ).status()
  ).toBe(200);
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("This task changed");
  await expect(page.getByLabel("Task title", { exact: true })).toHaveValue("Unsaved local edit");
  await page.screenshot({ path: testInfo.outputPath("tasks-stale-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "Reload latest tasks" }).click();
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Complete", exact: true }).click();
  await expect(card.getByText("Completed", { exact: true })).toBeVisible();
  await card.getByRole("button", { name: "Reopen", exact: true }).click();
  await expect(card.getByText("Open", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("tasks-list-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  );
  await page.getByRole("combobox", { name: "Interface language" }).selectOption("de");
  await expect(page.getByRole("heading", { name: "Tagesarbeit", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  );
  await expect(card).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Aufgabe gespeichert" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("tasks-mobile-de.png"), fullPage: true });
  await page.getByRole("combobox", { name: "Sprache der Oberfläche" }).selectOption("vi");
  await expect(
    page.getByRole("heading", { name: "Công việc hằng ngày", exact: true })
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  );
  await page.screenshot({ path: testInfo.outputPath("tasks-mobile-vi.png"), fullPage: true });

  const staffEmail = `tasks-staff-${run}@example.test`;
  const invitationResponse = await page.request.post(
    `/api/workspaces/${workspace.id}/pilot-setup/invites`,
    { headers: ownerHeaders, data: { email: staffEmail } }
  );
  expect(invitationResponse.status()).toBe(201);
  const { invite } = (await invitationResponse.json()) as CreateWorkspaceInviteOutput;
  const staffContext = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } });
  const member = await staffContext.newPage();
  await member.goto(`/invite#${invite.token}`);
  await member.getByRole("link", { name: "Create your studio account" }).click();
  await signup(member, staffEmail);
  await member.getByRole("button", { name: "Accept invitation", exact: true }).click();
  await expect(
    member.getByRole("heading", { name: "Workspace membership is active" })
  ).toBeVisible();
  const memberHeaders = await headers(member);
  const claims = JSON.parse(
    Buffer.from(memberHeaders.Authorization.split(".")[1], "base64url").toString()
  ) as { userId: string };
  expect(
    (
      await page.request.patch(`/api/people/staff/${profile.id}`, {
        headers: { ...scopeHeaders, "x-idempotency-key": randomUUID() },
        data: { displayName: profile.displayName, accountId: claims.userId, version: 1 },
      })
    ).status()
  ).toBe(200);
  await member.goto("/app/tasks");
  const ownCard = member.getByRole("article", {
    name: "Prepare reception for opening",
    exact: true,
  });
  await expect(ownCard).toBeVisible();
  await expect(member.getByRole("button", { name: "New task", exact: true })).toHaveCount(0);
  await expect(member.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0);
  await ownCard.getByRole("button", { name: "Complete", exact: true }).click();
  await expect(ownCard.getByText("Completed", { exact: true })).toBeVisible();
  expect(
    (
      await member.request.post("/api/tasks", {
        headers: {
          ...memberHeaders,
          "x-workspace-id": workspace.id,
          "x-idempotency-key": randomUUID(),
        },
        data: { title: "Denied", ownerStaffId: profile.id },
      })
    ).status()
  ).toBe(403);
  await member.screenshot({ path: testInfo.outputPath("tasks-staff-mobile.png"), fullPage: true });
  const final = (await (
    await page.request.get(`/api/tasks/${task.id}`, { headers: scopeHeaders })
  ).json()) as { id: string; status: string };
  expect(final).toMatchObject({ id: task.id, status: "COMPLETED" });
  // This journey did not publish booking or install financial apps.
  const stillPrivate = (await (
    await page.request.get("/api/workspaces", { headers: ownerHeaders })
  ).json()) as ListWorkspacesOutput;
  expect(stillPrivate.workspaces[0].publicEnabled).toBe(false);
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
    await admin.goto("/tasks");
    const sameTask = admin.getByRole("article", {
      name: "Prepare reception for opening",
      exact: true,
    });
    await expect(sameTask).toBeVisible();
    await expect(sameTask.getByText("Completed", { exact: true })).toBeVisible();
    await admin.screenshot({
      path: testInfo.outputPath("tasks-admin-desktop.png"),
      fullPage: true,
    });
    await sameTask.getByRole("button", { name: "Reopen", exact: true }).click();
    await expect(sameTask.getByText("Open", { exact: true })).toBeVisible();
    expect(
      (await (
        await page.request.get(`/api/tasks/${task.id}`, { headers: scopeHeaders })
      ).json()) as { status: string }
    ).toMatchObject({ status: "OPEN" });
    await adminContext.close();
  }
  await staffContext.close();
});
