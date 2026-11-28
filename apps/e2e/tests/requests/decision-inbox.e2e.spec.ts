import { expect, test, type BrowserContext } from "@playwright/test";
import type {
  OperationalRequest,
  OperationalRequestDraft,
  OperationalRequestQueueStatus,
} from "@corely/contracts";
import { legacyInvoiceTransport } from "../invoice-links/legacy-invoice-fixture";

const id = "5495a57a-37d0-43fe-95c4-de4808a9a806";
const time = "2026-11-28T09:30:00.000Z";
const evaluatedAt = "2026-11-28T11:30:00.000Z";
const privateText = "Synthetic detail visible only on the request";

test("a requester submits, the assigned reviewer opens and decides, and both lists reconcile", async ({
  browser,
  baseURL,
}, testInfo) => {
  let request: OperationalRequest | null = null;
  let reviewerAccess: "available" | "partial" | "revoked" = "available";
  let releaseFirstInbox = () => {};
  const holdFirstInbox = new Promise<void>((release) => {
    releaseFirstInbox = release;
  });
  let hold = true;

  async function createContext(role: "requester" | "reviewer"): Promise<BrowserContext> {
    const context = await browser.newContext({
      baseURL,
      viewport: { width: 1280, height: 900 },
      reducedMotion: "reduce",
      locale: "en-US",
    });
    await legacyInvoiceTransport(context);
    await context.addInitScript(() => localStorage.setItem("Corely One ERP-language", "en"));
    await context.route("**/api/auth/me", (route) =>
      route.fulfill({
        json: {
          userId: role,
          name: role === "reviewer" ? "Morgan Reviewer" : "Riley Requester",
          email: `${role}@example.invalid`,
          activeTenantId: "tenant-a",
          activeWorkspaceId: "workspace-a",
          memberships: [
            { tenantId: "tenant-a", tenantName: "Linden", roleId: "member", roleName: "Member" },
          ],
        },
      })
    );
    await context.route(
      (url) => url.pathname.startsWith("/api/operational-requests"),
      async (route) => {
        const sent = route.request();
        const url = new URL(sent.url());
        const method = sent.method();
        const isReviewer = role === "reviewer";
        expect((await sent.allHeaders())["x-workspace-id"]).toBe("workspace-a");
        if (method !== "GET") {
          expect((await sent.allHeaders())["x-idempotency-key"]).toBeTruthy();
        }
        if (
          url.pathname.endsWith("/inbox") ||
          (url.pathname.endsWith("/operational-requests") && method === "GET")
        ) {
          const inbox = url.pathname.endsWith("/inbox");
          if (inbox && (!isReviewer || reviewerAccess === "revoked")) {
            return route.fulfill({ status: 403, json: { message: "Requests review denied" } });
          }
          if (inbox && hold) {
            hold = false;
            await holdFirstInbox;
          }
          const current = inbox
            ? request?.status === "SUBMITTED" && reviewerAccess === "available"
              ? request
              : null
            : isReviewer
              ? null
              : request;
          const filter = url.searchParams.get("status");
          const queueStatus: OperationalRequestQueueStatus | undefined = current?.status;
          const item =
            current && (!filter || filter === queueStatus)
              ? [
                  {
                    id,
                    kind: current.kind,
                    status: current.status,
                    queueStatus,
                    updatedAt: time,
                    submittedAt: current.submittedAt,
                    ageSeconds: 7200,
                  },
                ]
              : [];
          return route.fulfill({
            json: {
              items: item,
              total: item.length,
              counts: queueStatus ? { [queueStatus]: 1 } : {},
              evaluatedAt,
              hasMore: false,
              canSubmit: !isReviewer,
              canManageRouting: false,
              canReview: isReviewer && reviewerAccess !== "revoked",
              sourceUnavailable: inbox && reviewerAccess === "partial",
            },
          });
        }
        if (url.pathname.endsWith("/operational-requests") && method === "POST") {
          expect(role).toBe("requester");
          const input: OperationalRequestDraft = sent.postDataJSON();
          expect(input).toMatchObject({ kind: "GENERAL", details: privateText });
          request = {
            id,
            kind: "GENERAL",
            draft: input,
            version: 1,
            status: "DRAFT",
            createdAt: time,
            updatedAt: time,
            submittedAt: null,
            withdrawnAt: null,
            attachments: [],
            canReadPolicy: false,
            review: [],
            application: null,
          };
        }
        if (!request || (isReviewer && request.status === "DRAFT")) {
          return route.fulfill({ status: 404, json: { message: "Request unavailable" } });
        }
        if (url.pathname.endsWith("/submit") && method === "POST") {
          expect(role).toBe("requester");
          expect(sent.postDataJSON()).toEqual({ version: 1 });
          request = {
            ...request,
            version: 2,
            status: "SUBMITTED",
            submittedAt: time,
            review: [{ action: "SUBMIT", version: 2, at: time, note: null }],
          };
        }
        if (url.pathname.endsWith("/decision") && method === "POST") {
          expect(role).toBe("reviewer");
          expect(sent.postDataJSON()).toMatchObject({ version: 2, decision: "APPROVE" });
          request = {
            ...request,
            version: 3,
            status: "APPROVED",
            review: [...request.review, { action: "APPROVE", version: 3, at: time, note: null }],
          };
        }
        return route.fulfill({
          json: {
            ...request,
            actions: {
              canEdit: !isReviewer && request.status === "DRAFT",
              canWithdraw: !isReviewer && request.status !== "APPROVED",
              canDecide: isReviewer && request.status === "SUBMITTED",
              canApply: false,
            },
          },
        });
      }
    );
    return context;
  }

  const requesterContext = await createContext("requester");
  const reviewerContext = await createContext("reviewer");
  try {
    const requester = await requesterContext.newPage();
    await requester.goto("/requests");
    await expect(requester.getByRole("heading", { name: "My requests" })).toBeVisible();
    await expect(requester.getByRole("link", { name: "Decision inbox" })).toHaveCount(0);
    await requester.getByRole("link", { name: "New request" }).click();
    await requester.getByLabel("Request type").selectOption("GENERAL");
    await requester.getByLabel("Subject").fill("Synthetic training");
    await requester.getByLabel("Details").fill(privateText);
    await requester.getByRole("button", { name: "Save draft" }).click();
    await expect(requester).toHaveURL(`/requests/${id}`);
    await requester.getByRole("button", { name: "Submit for review" }).click();
    await expect(requester.getByText("Submitted for review", { exact: true })).toBeVisible();

    const reviewer = await reviewerContext.newPage();
    await reviewer.goto("/requests");
    await reviewer.getByRole("link", { name: "Decision inbox" }).click();
    await expect(reviewer.getByRole("status").filter({ hasText: "Loading requests" })).toHaveCount(
      1
    );
    await reviewer.screenshot({
      path: testInfo.outputPath("desktop-inbox-loading.png"),
      animations: "disabled",
    });
    releaseFirstInbox();
    await expect(reviewer.getByRole("heading", { name: "Decision inbox" })).toBeVisible();
    await expect(reviewer.getByRole("option", { name: "All statuses (1)" })).toHaveCount(1);
    await expect(reviewer.getByRole("option", { name: "Submitted (1)" })).toHaveCount(1);
    await expect(reviewer.getByRole("list", { name: "Decision inbox" })).toContainText("2 hr. ago");
    await expect(reviewer.getByText(privateText)).toHaveCount(0);
    await reviewer.screenshot({
      path: testInfo.outputPath("desktop-inbox.png"),
      animations: "disabled",
    });
    await reviewer.getByLabel("Status", { exact: true }).selectOption("FAILED_APPLICATION");
    await expect(reviewer.getByText("No requests match this status.")).toBeVisible();
    await reviewer.getByLabel("Status", { exact: true }).selectOption("");
    await reviewer.getByRole("link", { name: /General Submitted/ }).click();
    await expect(reviewer.getByLabel("Details")).toHaveValue(privateText);
    await reviewer.getByRole("button", { name: "Approve request", exact: true }).click();
    await reviewer
      .getByRole("alertdialog")
      .getByRole("button", { name: "Approve request" })
      .click();
    await expect(reviewer.getByText("Approved", { exact: true }).first()).toBeVisible();
    await reviewer.getByRole("link", { name: "Back to decision inbox" }).click();
    await expect(reviewer.getByText("No requests need your attention.")).toBeVisible();
    await expect(reviewer.getByRole("option", { name: "All statuses (0)" })).toHaveCount(1);

    await requester.getByRole("link", { name: "Back to requests" }).click();
    await expect(requester.getByRole("option", { name: "Approved (1)" })).toHaveCount(1);
    await expect(requester.getByRole("list", { name: "My requests" })).toContainText("Approved");
    await expect(requester.getByText(privateText)).toHaveCount(0);

    await reviewer.setViewportSize({ width: 390, height: 844 });
    reviewerAccess = "partial";
    await reviewer.getByRole("button", { name: "Refresh" }).click();
    await expect(reviewer.getByText(/Some assigned requests are unavailable/)).toBeVisible();
    await expect(reviewer.getByText("No accessible requests to show.")).toBeVisible();
    expect(await reviewer.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await reviewer.screenshot({
      path: testInfo.outputPath("mobile-inbox-unavailable.png"),
      animations: "disabled",
    });
    reviewerAccess = "revoked";
    await reviewer.getByRole("button", { name: "Refresh" }).click();
    await expect(reviewer.getByRole("alert")).toContainText("You do not have access");
    await expect(reviewer.getByRole("list", { name: "Decision inbox" })).toHaveCount(0);
  } finally {
    releaseFirstInbox();
    await requesterContext.close();
    await reviewerContext.close();
  }
});
