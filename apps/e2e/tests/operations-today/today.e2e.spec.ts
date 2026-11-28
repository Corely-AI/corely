import { expect, test, type BrowserContext } from "@playwright/test";
import type { OperationsToday } from "@corely/contracts";
import { legacyInvoiceTransport } from "../invoice-links/legacy-invoice-fixture";

const at = "2026-11-28T12:00:00.000Z";
const end = "2026-11-28T12:30:00.000Z";
const requestId = "5495a57a-37d0-43fe-95c4-de4808a9a806";
const data = {
  workspaceId: "workspace-a",
  date: "2026-11-28",
  timezone: "Europe/Berlin",
  timezoneSource: "booking",
  evaluatedAt: end,
} as const;
const fresh = { status: "fresh", observedAt: at, total: 1 } as const;
const managerView: OperationsToday = {
  ...data,
  appointments: {
    ...fresh,
    items: [
      {
        id: "appointment",
        status: "CONFIRMED",
        startAt: at,
        endAt: end,
        href: "/openbuk/app/calendar",
      },
    ],
  },
  tasks: {
    ...fresh,
    status: "stale",
    items: [
      {
        id: "manager-task",
        title: "Check opening supplies",
        dueAt: at,
        status: "OPEN",
        href: "/tasks",
      },
    ],
  },
  decisions: {
    ...fresh,
    items: [
      {
        id: requestId,
        kind: "ABSENCE",
        status: "SUBMITTED",
        updatedAt: at,
        href: `/requests/${requestId}`,
      },
    ],
  },
  exceptions: {
    ...fresh,
    items: [{ appointmentId: "appointment", startAt: at, href: "/openbuk/app/calendar" }],
  },
};
const staffView: OperationsToday = {
  ...data,
  appointments: { status: "restricted", observedAt: null, total: null, items: [] },
  tasks: {
    ...fresh,
    items: [
      {
        id: "my-task",
        title: "Material bereitstellen",
        dueAt: at,
        status: "COMPLETED",
        href: "/tasks",
      },
    ],
  },
  decisions: { status: "unavailable", observedAt: null, total: null, items: [] },
  exceptions: { status: "disabled", observedAt: null, total: null, items: [] },
};

async function authenticate(context: BrowserContext, role: "manager" | "staff") {
  await legacyInvoiceTransport(context);
  await context.route("**/api/auth/me", (route) =>
    route.fulfill({
      json: {
        userId: role,
        name: role === "manager" ? "Morgan Manager" : "Riley Staff",
        email: `${role}@example.invalid`,
        activeTenantId: "tenant-a",
        activeWorkspaceId: "workspace-a",
        memberships: [
          {
            tenantId: "tenant-a",
            tenantName: "Linden",
            roleId: role,
            roleName: role === "manager" ? "Admin" : "Member",
          },
        ],
      },
    })
  );
}

test("a manager sees the authorized day, then follows a decision to its owner", async ({
  page,
  context,
}, testInfo) => {
  await authenticate(context, "manager");
  await context.addInitScript(() => localStorage.setItem("Corely One ERP-language", "en"));
  let release = () => {};
  const beforeFirstRead = new Promise<void>((resolve) => {
    release = resolve;
  });
  await context.route("**/api/operations/today", async (route) => {
    expect((await route.request().allHeaders())["x-workspace-id"]).toBe("workspace-a");
    await beforeFirstRead;
    return route.fulfill({ json: managerView });
  });
  await context.route(
    (url) => url.pathname === "/api/operational-requests",
    (route) =>
      route.fulfill({
        json: { items: [], hasMore: false, canSubmit: false, canManageRouting: false },
      })
  );
  await context.route(`**/api/operational-requests/${requestId}`, (route) =>
    route.fulfill({ status: 403, json: { message: "Current permissions denied" } })
  );
  try {
    await page.goto("/today");
    await expect(page.getByRole("status").filter({ hasText: "Loading today’s work" })).toHaveCount(
      1
    );
    await page.screenshot({
      path: testInfo.outputPath("desktop-today-loading.png"),
      animations: "disabled",
    });
    release();
    await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
    await expect(page.getByText("Europe/Berlin")).toBeVisible();
    await expect(page.getByRole("list", { name: "Appointments" })).toContainText("Confirmed");
    await expect(page.getByRole("list", { name: "Tasks due today" })).toContainText(
      "Check opening supplies"
    );
    await expect(page.getByText("This source may be out of date.")).toBeVisible();
    await expect(page.getByRole("list", { name: "Schedule exceptions" })).toContainText(
      "Coverage needs attention"
    );
    await page.screenshot({
      path: testInfo.outputPath("desktop-manager-today.png"),
      animations: "disabled",
    });
    await page
      .getByRole("list", { name: "Decisions" })
      .getByRole("link", { name: /Absence Submitted/ })
      .click();
    await expect(page).toHaveURL(`/requests/${requestId}`);
    await expect(page.getByRole("alert")).toContainText("do not have access");
  } finally {
    release();
  }
});

test("a staff member retains mobile daily work when other sources are restricted or unavailable", async ({
  page,
  context,
}, testInfo) => {
  await authenticate(context, "staff");
  await context.addInitScript(() => localStorage.setItem("Corely One ERP-language", "de"));
  await context.route("**/api/operations/today", async (route) => {
    expect((await route.request().allHeaders())["x-workspace-id"]).toBe("workspace-a");
    return route.fulfill({ json: staffView });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/today?lang=de");
  await expect(page.getByRole("heading", { name: "Heute", exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "Heute fällige Aufgaben" })).toContainText(
    "Material bereitstellen"
  );
  await expect(page.getByText("Du hast keinen Zugriff auf diese Quelle.")).toBeVisible();
  await expect(page.getByText("Diese Quelle ist vorübergehend nicht verfügbar.")).toBeVisible();
  await expect(page.getByText("Diese App ist in diesem Arbeitsbereich deaktiviert.")).toBeVisible();
  await expect(page.getByText("Check opening supplies")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("mobile-staff-today.png"),
    animations: "disabled",
    fullPage: true,
  });
  await page.getByRole("link", { name: /Material bereitstellen/ }).click();
  await expect(page).toHaveURL("/tasks");
});
