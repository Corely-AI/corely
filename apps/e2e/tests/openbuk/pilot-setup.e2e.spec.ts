import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import type { ListWorkspacesOutput, CreateWorkspaceInviteOutput } from "@corely/contracts";

// Real auth/storage/publication; one aborted draft request exercises retry UX.
// Never run against customer data or an unverified target.
test.beforeAll(() => {
  if (
    !/^postgres(?:ql)?:\/\/[^/]+\/openbuk_test_[a-z0-9_]+(?:\?.*)?$/.test(
      process.env.OPENBUK_TEST_DATABASE_URL ?? ""
    )
  ) {
    throw new Error("Pilot acceptance requires an explicitly disposable openbuk_test_* database");
  }
});
async function headers(page: Page) {
  const token = await page.evaluate(() => localStorage.getItem("openbuk:access"));
  if (!token) {
    throw new Error("Missing test account authentication");
  }
  return { Authorization: `Bearer ${token}` };
}
async function signup(page: Page, email: string, name: string) {
  await page.goto("/signup");
  await page.getByLabel("Your name", { exact: true }).fill("Pilot test account");
  await page.getByLabel("Studio name", { exact: true }).fill(name);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Pilot-local-304-2026!");
  await page.getByRole("button", { name: "Start free", exact: true }).click();
}

test("private setup resumes, publishes explicitly, and repeated staff invitations associate one account", async ({
  page,
  browser,
}, testInfo) => {
  const run = randomUUID();
  const staffEmail = `staff-${run}@example.test`;
  await signup(page, `owner-${run}@example.test`, `Pilot ${run}`);
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeVisible();
  await page.getByLabel("Studio name", { exact: true }).fill(`Pilot ${run}`);
  await page.getByLabel("Time zone", { exact: true }).fill("Mars/Olympus");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("IANA");
  await page.getByLabel("Time zone", { exact: true }).fill("Asia/Ho_Chi_Minh");
  await page.getByRole("combobox", { name: "Booking language", exact: true }).selectOption("vi");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  const ownerHeaders = await headers(page);
  const workspaces = await page.request.get("/api/workspaces", { headers: ownerHeaders });
  expect(workspaces.status()).toBe(200);
  const { workspaces: owned } = (await workspaces.json()) as ListWorkspacesOutput;
  expect(owned).toHaveLength(1);
  const workspace = owned[0];
  expect(workspace.publicEnabled).toBe(false);
  expect(
    (
      await page.request.put("/api/openbuk/setup", {
        headers: { ...ownerHeaders, "x-workspace-id": workspace.id },
        data: { timezone: "Mars/Olympus" },
      })
    ).status()
  ).toBe(400);
  expect((await page.request.get(`/api/w/${workspace.slug}/public/openbuk/studio`)).status()).toBe(
    404
  );
  await page.reload();
  await expect(page.getByLabel("Time zone", { exact: true })).toHaveValue("Asia/Ho_Chi_Minh");
  await expect(page.getByRole("combobox", { name: "Booking language", exact: true })).toHaveValue(
    "vi"
  );
  await expect(page.getByLabel("Studio name", { exact: true })).toHaveValue(`Pilot ${run}`);
  await page.getByLabel("Studio name", { exact: true }).press("Tab");
  await expect(page.getByLabel("Time zone", { exact: true })).toBeFocused();
  await page.route("**/api/openbuk/setup", (route) => route.abort("failed"));
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Please check your hours");
  await expect(page.getByLabel("Time zone", { exact: true })).toHaveValue("Asia/Ho_Chi_Minh");
  await page.unroute("**/api/openbuk/setup");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  expect(
    (
      (await (
        await page.request.get("/api/workspaces", { headers: ownerHeaders })
      ).json()) as ListWorkspacesOutput
    ).workspaces
  ).toHaveLength(1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  );
  await page.screenshot({ path: testInfo.outputPath("private-draft-mobile.png"), fullPage: true });
  await page.getByLabel("Service name", { exact: true }).fill("Pilot service");
  await page.getByLabel("Team member’s name", { exact: true }).fill("Test bookable resource");
  const publishRequest = page.waitForRequest(
    (request) => request.url().endsWith("/openbuk/studio/publish") && request.method() === "POST"
  );
  await page.getByRole("button", { name: "Save & publish booking page" }).click();
  const setupBody: unknown = (await publishRequest).postDataJSON();
  await expect(page.getByText("Your booking page is ready", { exact: true })).toBeVisible();
  expect((await page.request.get(`/api/w/${workspace.slug}/public/openbuk/studio`)).status()).toBe(
    200
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("link", { name: "Studio settings", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Invite staff" })).toBeVisible();
  await expect(page.getByLabel("Service name", { exact: true })).toHaveValue("Pilot service");
  await page.screenshot({ path: testInfo.outputPath("settings-desktop.png"), fullPage: true });
  await page
    .locator(".staff-invitations")
    .screenshot({ path: testInfo.outputPath("invite-form.png") });
  await page.getByLabel("Staff email", { exact: true }).fill(staffEmail);
  await page.getByRole("button", { name: "Create invitation link" }).click();
  await expect(page.getByText(/Invitation ready. No email was sent/)).toBeVisible();
  const link = await page.getByLabel("Private invitation link", { exact: true }).inputValue();
  await page.getByRole("button", { name: "Create invitation link" }).click();
  await expect(page.getByLabel("Private invitation link", { exact: true })).toHaveValue(link);
  const inviteResponse = await page.request.post(
    `/api/workspaces/${workspace.id}/pilot-setup/invites`,
    { headers: ownerHeaders, data: { email: staffEmail.toUpperCase() } }
  );
  expect(inviteResponse.status()).toBe(201);
  const { invite } = (await inviteResponse.json()) as CreateWorkspaceInviteOutput;
  expect(new URL(link).hash).toBe(`#${invite.token}`);
  // An authenticated owner rejects an invitation addressed to a different account.
  // The account-level request must omit its active workspace selector, while
  // failure and dismissal must preserve that existing selection.
  await page.goto(link);
  const rejectedInvite = page.waitForRequest((request) =>
    request.url().endsWith("/pilot-setup/invites/accept")
  );
  await page.getByRole("button", { name: "Accept invitation", exact: true }).click();
  expect((await rejectedInvite).headers()["x-workspace-id"]).toBeUndefined();
  await expect(page.getByRole("alert")).toContainText("invitation could not be accepted");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("openbuk:workspace")))
    .toBe(workspace.id);
  await page.screenshot({ path: testInfo.outputPath("invitation-rejected.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: testInfo.outputPath("invitation-rejected-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("link", { name: "Continue without joining" }).click();
  await expect(page.getByText("Your booking page is ready", { exact: true })).toBeVisible();
  const cacheKey = `pilot-publication-${run}`;
  const { tenantId } = JSON.parse(
    Buffer.from(ownerHeaders.Authorization.split(".")[1], "base64url").toString()
  ) as { tenantId: string };
  const publication = { tenantId, publicEnabled: true, publicModules: { booking: true } };
  expect(
    (
      await page.request.patch(`/api/workspaces/${workspace.id}`, {
        headers: { ...ownerHeaders, "x-idempotency-key": cacheKey },
        data: publication,
      })
    ).status()
  ).toBe(200);

  const staffContext = await browser.newContext();
  const member = await staffContext.newPage();
  await member.goto("/invite#invalid");
  await expect(member.getByRole("alert")).toContainText("invitation could not be accepted");
  await member.goto(link);
  await expect(member.getByRole("heading", { name: "Join a workspace" })).toBeVisible();
  await member.getByRole("link", { name: "Create your studio account" }).click();
  await member.getByLabel("Your name", { exact: true }).fill("Invited test member");
  await member.getByLabel("Studio name", { exact: true }).fill(`Member home ${run}`);
  await member.getByLabel("Email", { exact: true }).fill(staffEmail);
  await member.getByLabel("Password", { exact: true }).fill("Pilot-local-304-2026!");
  await member.getByRole("button", { name: "Start free", exact: true }).click();
  await expect(member.getByRole("button", { name: "Accept invitation" })).toBeVisible();
  await member.getByRole("button", { name: "Accept invitation" }).click();
  await expect(
    member.getByRole("heading", { name: "Workspace membership is active" })
  ).toBeVisible();
  const memberHeaders = await headers(member);
  const [a, b] = await Promise.all(
    [0, 1].map(() =>
      member.request.post("/api/workspaces/pilot-setup/invites/accept", {
        headers: memberHeaders,
        data: { token: invite.token },
      })
    )
  );
  expect(a.status()).toBe(201);
  expect(b.status()).toBe(201);
  expect(await a.json()).toEqual(await b.json());
  const staffList = await member.request.get(`/api/workspaces/${workspace.id}/members`, {
    headers: memberHeaders,
  });
  expect(staffList.status()).toBe(200);
  expect(await staffList.json()).not.toHaveProperty("invites");
  const memberships = await member.request.get(`/api/workspaces/${workspace.id}/members`, {
    headers: ownerHeaders,
  });
  expect(memberships.status()).toBe(200);
  expect(
    ((await memberships.json()) as { members: Array<{ email: string }> }).members.filter(
      (m) => m.email === staffEmail
    )
  ).toHaveLength(1);
  for (const [method, path, data] of [
    ["put", "/openbuk/setup", { timezone: "UTC" }],
    ["post", "/openbuk/studio/publish", setupBody],
    [
      "post",
      `/workspaces/${workspace.id}/pilot-setup/invites`,
      { email: `other-${run}@example.test` },
    ],
    ["patch", `/workspaces/${workspace.id}`, publication],
  ] as const) {
    const response = await member.request.fetch(`/api${path}`, {
      method,
      headers: { ...memberHeaders, "x-workspace-id": workspace.id, "x-idempotency-key": cacheKey },
      data,
    });
    expect(response.status()).toBe(403);
  }
  await member.goto("/app/settings");
  await expect(
    member.getByRole("heading", { name: "Workspace membership is active" })
  ).toBeVisible();
  await expect(member.getByRole("button", { name: "Save draft" })).toHaveCount(0);
  await member.screenshot({ path: testInfo.outputPath("member-access.png"), fullPage: true });
  await staffContext.close();
});
