import { expect, type BrowserContext, type Route } from "@playwright/test";
import type { EmployeeTask, OpenBukPublicStudio, OperationalRequest } from "@corely/contracts";
import { legacyInvoiceTransport } from "../invoice-links/legacy-invoice-fixture";

export const time = "2026-11-28T12:00:00.000Z";
const workspaceId = "workspace-a";
export const requestId = "81e6d37c-6722-4374-9a7b-fc0e34667e14";
export const taskTitle = "Material für die Öffnung bereitstellen";

export async function authenticate(context: BrowserContext, locale: "en" | "de" | "vi") {
  await legacyInvoiceTransport(context);
  await context.addInitScript((lang) => {
    localStorage.setItem("Corely One ERP-language", lang);
    localStorage.setItem("openbuk:locale", lang);
  }, locale);
  await context.route(
    (url) =>
      url.pathname.endsWith("/config") &&
      url.searchParams.get("packageId") === "internal-operations",
    async (route) => {
      expect((await route.request().allHeaders())["x-workspace-id"]).toBe(workspaceId);
      return route.fulfill({
        json: {
          workspaceId,
          currentUser: { isWorkspaceAdmin: true },
          operationalPackage: {
            packageId: "internal-operations",
            client: "openbuk-web",
            experiences: [
              {
                id: "schedule",
                label: "Schedule",
                appId: "booking",
                availability: { status: "available", route: "/app" },
              },
              {
                id: "team",
                label: "Team",
                appId: "people",
                availability: { status: "available", route: "/app/me" },
              },
              {
                id: "daily-work",
                label: "Daily Work",
                appId: "tasks",
                availability: { status: "available", route: "/app/tasks" },
              },
              {
                id: "decisions",
                label: "Decisions",
                appId: "requests",
                availability: { status: "available", route: "/requests/inbox" },
              },
              {
                id: "knowledge",
                label: "Knowledge",
                availability: { status: "unavailable", reason: "not-implemented" },
              },
            ],
          },
        },
      });
    }
  );
}

export async function taskTransport(context: BrowserContext, failFirstRead = false) {
  let task: EmployeeTask = {
    id: "e40ba764-d314-4ee6-8678-cb1b75edf6e0",
    workspaceId,
    title: taskTitle,
    ownerStaffId: "0a768b12-8b83-443a-8a03-cc2ff245ce99",
    ownerName: "Riley",
    ownerArchived: false,
    status: "OPEN",
    version: 1,
    dueAt: time,
    createdAt: time,
    updatedAt: time,
    completedAt: null,
  };
  let loseRead = failFirstRead;
  await context.route(
    (url) => url.pathname.startsWith("/api/tasks"),
    async (route) => {
      const { pathname } = new URL(route.request().url());
      if (pathname === "/api/tasks") {
        if (loseRead) {
          return route.fulfill({ status: 503, json: { message: "Synthetic read unavailable" } });
        }
        return route.fulfill({
          json: {
            items: [task],
            total: 1,
            page: 1,
            pageSize: 30,
            timezone: "Europe/Berlin",
            capabilities: { manage: true, completeOwn: true },
          },
        });
      }
      if (pathname.endsWith("/complete")) {
        expect(route.request().postDataJSON()).toEqual({ version: 1 });
        expect((await route.request().allHeaders())["x-workspace-id"]).toBe(workspaceId);
        task = { ...task, status: "COMPLETED", version: 2, completedAt: time };
        return route.fulfill({ json: task });
      }
      if (pathname.endsWith("/assignees")) {
        return route.fulfill({ json: [{ id: task.ownerStaffId, displayName: task.ownerName }] });
      }
      return route.fallback();
    }
  );
  return {
    recover: () => {
      loseRead = false;
    },
  };
}

export async function requestTransport(context: BrowserContext) {
  const request: OperationalRequest = {
    id: requestId,
    kind: "ABSENCE",
    status: "SUBMITTED",
    version: 2,
    updatedAt: time,
    createdAt: time,
    submittedAt: time,
    withdrawnAt: null,
    attachments: [],
    canReadPolicy: false,
    application: null,
    review: [{ action: "SUBMIT", at: time, version: 2, note: null }],
    actions: { canEdit: false, canWithdraw: false, canDecide: true, canApply: false },
    draft: {
      kind: "ABSENCE",
      firstDay: "2026-12-10",
      lastDay: "2026-12-11",
      reason: "Synthetic scheduled leave",
      policyDocumentId: null,
    },
  };
  const writes: string[] = [];
  await context.route(
    (url) => url.pathname.startsWith("/api/operational-requests"),
    async (route) => {
      const { pathname } = new URL(route.request().url());
      if (route.request().method() !== "GET") {
        writes.push(pathname);
        return route.fulfill({
          status: 409,
          json: { message: "No synthetic writes in this journey" },
        });
      }
      if (pathname === "/api/operational-requests") {
        return route.fulfill({
          json: {
            items: [],
            hasMore: false,
            canReview: true,
            canSubmit: false,
            canManageRouting: false,
          },
        });
      }
      return route.fulfill({ json: request });
    }
  );
  return writes;
}

export async function publicBookingTransport(context: BrowserContext) {
  const studio: OpenBukPublicStudio = {
    studioName: "Linden Studio",
    timezone: "Europe/Berlin",
    locale: "en",
    currency: "EUR",
    serviceName: "Studio appointment",
    durationMinutes: 45,
    priceCents: 3500,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    staffName: "Riley",
    minimumNoticeMinutes: 0,
    maximumAdvanceDays: 14,
    slug: "linden-studio",
    staffId: "staff-synthetic",
    serviceId: "service-synthetic",
  };
  await context.route("**/api/w/linden-studio/public/openbuk/**", (route: Route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname.endsWith("/studio")) {
      return route.fulfill({ json: { studio } });
    }
    if (pathname.endsWith("/availability")) {
      return route.fulfill({
        json: { slots: [{ startAt: time, endAt: "2026-11-28T12:45:00.000Z" }] },
      });
    }
    return route.fulfill({ status: 404, json: { message: "Unexpected synthetic request" } });
  });
}
