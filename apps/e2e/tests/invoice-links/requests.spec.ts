import { test, expect } from "@playwright/test";
import { legacyInvoiceTransport } from "./legacy-invoice-fixture";

test("opens Requests, accepts both types, and retries a client completion update", async ({
  page,
  context,
}, info) => {
  await legacyInvoiceTransport(context);
  await page.setViewportSize({ width: 1440, height: 900 });
  let issue = {
    id: "req-freezer",
    tenantId: "tenant-a",
    requestKind: "PROBLEM",
    title: "Freezer stopped cooling",
    description: "Freezer at the client site requires service.",
    clientEmail: "client@example.invalid",
    status: "NEW",
    priority: "MEDIUM",
    siteType: "CUSTOMER",
    assigneeUserId: null as string | null,
    createdAt: "2026-11-24T08:00:00.000Z",
    updatedAt: "2026-11-24T08:00:00.000Z",
    clientUpdateStatus: null as string | null,
    clientUpdateSummary: null as string | null,
  };
  const submissions: string[] = [];
  const deliveries: string[] = [];
  let notes: { id: string; body: string; createdByUserId: string; createdAt: string }[] = [];
  let visible = true;
  let canOperate = true;
  await context.route("**/api/menu/launches", async (route) =>
    route.fulfill({
      json: [
        {
          appId: "issues",
          name: "Requests",
          tier: 1,
          version: "1",
          enabled: true,
          dependencies: [],
          directory: {
            menuId: "issues",
            category: "operations",
            displayName: { en: "Requests", de: "Anfragen", vi: "Yêu cầu" },
            logo: { iconKey: "ShieldAlert", tone: "accent" },
            destination: { origin: new URL(route.request().url()).origin, path: "/issues" },
          },
        },
      ],
    })
  );
  await context.route("**/api/workspaces/workspace-a/members", (route) =>
    route.fulfill({
      json: { members: [{ userId: "user-a", name: "Alex Example", status: "ACTIVE" }] },
    })
  );
  await context.route(/\/api\/issues(?:[/?]|$)/, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/issues") {
      await route.fulfill({
        json: {
          items: submissions.length ? [issue] : [],
          canOperate: true,
          pageInfo: {
            page: 1,
            pageSize: 20,
            total: submissions.length ? 1 : 0,
            hasNextPage: false,
          },
        },
      });
      return;
    }
    if (path === "/api/issues/requests") {
      const input = route.request().postDataJSON();
      expect(await route.request().headerValue("x-workspace-id")).toBe("workspace-a");
      submissions.push(input.kind);
      issue = { ...issue, ...input, requestKind: input.kind };
      await route.fulfill({ json: { id: issue.id } });
      return;
    }
    if (path.endsWith("/assign"))
      issue.assigneeUserId = route.request().postDataJSON().assigneeUserId;
    if (path.endsWith("/status")) issue.status = route.request().postDataJSON().status;
    if (path.endsWith("/resolve")) issue.status = "RESOLVED";
    if (path.endsWith("/comments")) {
      notes = [
        {
          id: "note",
          body: route.request().postDataJSON().body,
          createdByUserId: "user-a",
          createdAt: issue.createdAt,
        },
      ];
      await route.fulfill({ json: { comment: notes[0] } });
      return;
    }
    if (path.endsWith("/client-update")) {
      const { recipient, summary } = route.request().postDataJSON();
      deliveries.push(recipient);
      expect(summary).toBe("The freezer is back in service.");
      issue.clientUpdateSummary = summary;
      issue.clientUpdateStatus = deliveries.length === 1 ? "FAILED" : "SENT";
      await route.fulfill({ json: { accepted: true } });
      return;
    }
    await route.fulfill({
      status: visible ? 200 : 404,
      json: {
        issue: canOperate
          ? issue
          : {
              id: issue.id,
              title: issue.title,
              description: issue.description,
              status: issue.status,
            },
        comments: canOperate ? notes : [],
        activity: [],
        canOperate,
      },
    });
  });
  await page.goto("/apps?workspaceId=workspace-a");
  await expect(page.getByRole("button", { name: "Open: Requests" })).toBeVisible();
  await page.screenshot({ path: info.outputPath("requests-app-center.png") });
  await page.getByRole("button", { name: "Open: Requests" }).click();
  await expect(page.getByRole("heading", { name: "Requests", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Submit a request" }).first().click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("Title", { exact: true }).fill(issue.title);
  await page.getByLabel("Description", { exact: true }).fill(issue.description);
  await page.getByLabel("Client email (optional)").fill(issue.clientEmail);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("request-intake-mobile.png") });
  await page.getByRole("button", { name: "Submit a request" }).click();
  await expect(page.getByRole("heading", { name: issue.title })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("combobox", { name: "Assignee" }).click();
  await page.getByRole("option", { name: "Alex Example" }).click();
  await page.getByRole("button", { name: "Assign", exact: true }).click();
  await expect.poll(() => issue.assigneeUserId).toBe("user-a");
  await page
    .getByRole("textbox", { name: "Add internal note" })
    .fill("Internal troubleshooting note");
  await page.getByRole("button", { name: "Save internal note" }).click();
  await expect(page.getByText("Internal troubleshooting note", { exact: true })).toBeVisible();
  await page
    .getByRole("combobox")
    .filter({ hasText: /status/i })
    .click();
  await page.getByRole("option", { name: "In Progress", exact: false }).click();
  await page.getByRole("button", { name: "Update status", exact: false }).click();
  await expect(page.getByText("In Progress", { exact: false }).first()).toBeVisible();
  await page.getByRole("button", { name: "Resolve", exact: true }).click();
  await page.getByLabel("Completion summary").fill("The freezer is back in service.");
  await page.getByLabel("I’ve confirmed the recipient").check();
  await page.getByRole("button", { name: "Send client update" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Send failed" })).toBeVisible();
  await page.screenshot({ path: info.outputPath("request-update-failed.png"), fullPage: true });
  await page.getByRole("button", { name: "Retry client update" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Sent" })).toBeVisible();
  expect(deliveries).toEqual(["client@example.invalid", "client@example.invalid"]);
  canOperate = false;
  await page.reload();
  await expect(page.getByRole("heading", { name: issue.title })).toBeVisible();
  await expect(page.getByText("Internal troubleshooting note")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Client update" })).toHaveCount(0);
  visible = false;
  await page.reload();
  await expect(page.getByText(/failed to load|could not load/i)).toBeVisible();
  await page.goto("/issues/submit");
  await page.getByLabel("Request a service").check();
  await page.getByLabel("Title", { exact: true }).fill("Install a freezer");
  await page.getByLabel("Description", { exact: true }).fill("Install at the client site.");
  await page.getByRole("button", { name: "Submit a request" }).click();
  await expect.poll(() => submissions).toEqual(["PROBLEM", "SERVICE"]);
});
