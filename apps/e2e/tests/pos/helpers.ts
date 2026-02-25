import { expect, type Page } from "@playwright/test";

export const POS_IDS = {
  workspaceId: "2f00417b-b4d9-4bd5-a2d9-0d0e68221601",
  userId: "50c01ad4-c5d3-4bc6-9e12-3e7f53ef1502",
  registerId: "ca9b267f-50e9-4e4e-830d-e83f2c7e4ec0",
  productId: "f4af671d-0e48-4bb7-bdcf-1db8d7d7f909",
  customerId: "4b875de2-e2ce-4582-a1db-30735f786195",
  serverInvoiceId: "45fe4f78-63ef-4ef7-a42b-388387ff7bc4",
  serverPaymentId: "599f801a-e95f-43cc-acc6-aa69b17f6e14",
};

type MockPosApiOptions = {
  failShiftOpenAttempts?: number;
  startWithOpenShift?: boolean;
};

export async function installPosApiMock(
  page: Page,
  options: MockPosApiOptions = {}
): Promise<void> {
  const buildShift = (sessionId: string, nowIso = new Date().toISOString()) => ({
    sessionId,
    registerId: POS_IDS.registerId,
    workspaceId: POS_IDS.workspaceId,
    openedByEmployeePartyId: POS_IDS.userId,
    openedAt: nowIso,
    startingCashCents: 10_000,
    status: "OPEN",
    closedAt: null,
    closedByEmployeePartyId: null,
    closingCashCents: null,
    totalSalesCents: 0,
    totalCashReceivedCents: 0,
    varianceCents: null,
    notes: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  let currentShift: Record<string, unknown> | null = options.startWithOpenShift
    ? buildShift("7f4a5af8-c14a-411f-9050-04253f89c049")
    : null;
  let remainingShiftOpenFailures = options.failShiftOpenAttempts ?? 0;

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname;
    const origin = request.headers().origin ?? "http://localhost:18084";
    const headers = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Idempotency-Key, X-Workspace-Id",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
      "Content-Type": "application/json",
    };

    if (method === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }

    const fulfillJson = async (status: number, payload: unknown) => {
      await route.fulfill({
        status,
        headers,
        body: JSON.stringify(payload),
      });
    };

    if (path.endsWith("/auth/login") && method === "POST") {
      await fulfillJson(200, {
        accessToken: "pos-e2e-access-token",
        refreshToken: "pos-e2e-refresh-token",
        userId: POS_IDS.userId,
        email: "cashier@corely.test",
        workspaceId: POS_IDS.workspaceId,
      });
      return;
    }

    if (path.endsWith("/auth/logout") && method === "POST") {
      await fulfillJson(200, { ok: true });
      return;
    }

    if (path.endsWith("/customers/search") && method === "GET") {
      await fulfillJson(200, {
        items: [
          {
            id: POS_IDS.customerId,
            displayName: "Ada Customer",
            phone: "+12025550199",
            email: "ada.customer@corely.test",
            tags: ["vip"],
          },
        ],
        nextCursor: null,
      });
      return;
    }

    if (path.match(/\/customers\/[0-9a-f-]+$/) && method === "GET") {
      await fulfillJson(200, {
        id: POS_IDS.customerId,
        displayName: "Ada Customer",
        phone: "+12025550199",
        email: "ada.customer@corely.test",
        tags: ["vip"],
      });
      return;
    }

    if (path.endsWith("/pos/registers") && method === "GET") {
      const now = new Date().toISOString();
      await fulfillJson(200, {
        registers: [
          {
            registerId: POS_IDS.registerId,
            workspaceId: POS_IDS.workspaceId,
            name: "Front Register",
            defaultWarehouseId: null,
            defaultBankAccountId: null,
            status: "ACTIVE",
            createdAt: now,
            updatedAt: now,
          },
        ],
      });
      return;
    }

    if (path.endsWith("/pos/catalog/snapshot") && method === "GET") {
      await fulfillJson(200, {
        products: [
          {
            productId: POS_IDS.productId,
            sku: "SKU-COFFEE-001",
            name: "Demo Coffee Beans",
            barcode: "1234567890123",
            priceCents: 1299,
            taxable: true,
            status: "ACTIVE",
            estimatedQty: 50,
          },
        ],
        hasMore: false,
        total: 1,
      });
      return;
    }

    if (path.endsWith("/pos/shifts/current") && method === "GET") {
      await fulfillJson(200, {
        session: currentShift,
      });
      return;
    }

    if (path.endsWith("/pos/shifts/open") && method === "POST") {
      if (remainingShiftOpenFailures > 0) {
        remainingShiftOpenFailures -= 1;
        await fulfillJson(503, {
          title: "Shift open unavailable",
          status: 503,
          detail: "Temporary sync failure",
        });
        return;
      }

      const payload = request.postDataJSON() as {
        sessionId: string;
        registerId: string;
        openedByEmployeePartyId: string;
        startingCashCents: number | null;
        notes?: string;
      };
      const now = new Date().toISOString();
      currentShift = {
        ...buildShift(payload.sessionId, now),
        registerId: payload.registerId,
        openedByEmployeePartyId: payload.openedByEmployeePartyId,
        startingCashCents: payload.startingCashCents,
        notes: payload.notes ?? null,
      };

      await fulfillJson(200, {
        sessionId: payload.sessionId,
        status: "OPEN",
        openedAt: now,
      });
      return;
    }

    if (path.endsWith("/pos/shifts/close") && method === "POST") {
      const payload = request.postDataJSON() as {
        sessionId: string;
        closingCashCents: number | null;
      };
      const now = new Date().toISOString();
      currentShift = null;
      await fulfillJson(200, {
        sessionId: payload.sessionId,
        status: "CLOSED",
        closedAt: now,
        totalSalesCents: 0,
        totalCashReceivedCents: 0,
        varianceCents: payload.closingCashCents,
      });
      return;
    }

    if (path.endsWith("/pos/sales/sync") && method === "POST") {
      await fulfillJson(200, {
        ok: true,
        serverInvoiceId: POS_IDS.serverInvoiceId,
        serverPaymentId: POS_IDS.serverPaymentId,
        receiptNumber: "POS-E2E-0001",
      });
      return;
    }

    if (path.match(/\/engagement\/loyalty\/[0-9a-f-]+\/ledger$/) && method === "GET") {
      await fulfillJson(200, {
        items: [
          {
            entryId: "f409d5f3-1601-49a7-8fd6-6f18a8c26a23",
            pointsDelta: 12,
            reasonCode: "CHECK_IN",
            createdAt: new Date().toISOString(),
          },
        ],
        nextCursor: null,
      });
      return;
    }

    if (path.match(/\/engagement\/loyalty\/[0-9a-f-]+$/) && method === "GET") {
      await fulfillJson(200, {
        account: {
          customerPartyId: POS_IDS.customerId,
          currentPointsBalance: 128,
          tierCode: "GOLD",
        },
      });
      return;
    }

    if (path.endsWith("/engagement/checkins") && method === "GET") {
      await fulfillJson(200, {
        items: [
          {
            checkInEventId: "f391539d-e5cc-4a40-9b6f-e90d311f45db",
            customerPartyId: POS_IDS.customerId,
            registerId: POS_IDS.registerId,
            status: "ACTIVE",
            checkedInAt: new Date().toISOString(),
            pointsAwarded: 0,
            assignedEmployeePartyId: null,
            notes: null,
          },
        ],
        nextCursor: null,
      });
      return;
    }

    if (path.endsWith("/engagement/checkins") && method === "POST") {
      const payload = request.postDataJSON() as {
        checkInEventId: string;
        customerPartyId: string;
        registerId: string;
        checkedInAt?: string;
      };

      await fulfillJson(200, {
        checkInEvent: {
          checkInEventId: payload.checkInEventId,
          customerPartyId: payload.customerPartyId,
          registerId: payload.registerId,
          status: "ACTIVE",
          checkedInAt: payload.checkedInAt ?? new Date().toISOString(),
          assignedEmployeePartyId: null,
          notes: null,
        },
        pointsAwarded: 0,
      });
      return;
    }

    if (path.includes("/cash-registers/") && path.endsWith("/entries") && method === "POST") {
      await fulfillJson(200, {
        entry: {
          entryId: "5f0b7118-56f8-4428-89c7-989fb4568eb2",
        },
      });
      return;
    }

    await fulfillJson(404, {
      title: "Not found",
      status: 404,
      detail: `No mock implemented for ${method} ${path}`,
    });
  });
}

export function autoAcceptNativeDialogs(page: Page): void {
  page.on("dialog", (dialog) => {
    void dialog.accept();
  });
}

export async function bootstrapAuthenticatedPos(
  page: Page,
  options?: { requireOpenShiftForSales?: boolean }
): Promise<void> {
  await page.addInitScript(
    ({ ids, requireOpenShiftForSales }) => {
      const prefix = "corely-pos.secure.";
      const set = (key: string, value: string) => {
        localStorage.setItem(`${prefix}${key}`, value);
      };

      set("accessToken", "pos-e2e-access-token");
      set("refreshToken", "pos-e2e-refresh-token");
      set("activeWorkspaceId", ids.workspaceId);
      set("pos.require-open-shift-for-sales", requireOpenShiftForSales ? "true" : "false");
      set(
        "user",
        JSON.stringify({
          userId: ids.userId,
          workspaceId: ids.workspaceId,
          email: "cashier@corely.test",
        })
      );
    },
    { ids: POS_IDS, requireOpenShiftForSales: options?.requireOpenShiftForSales ?? true }
  );

  await page.goto("/");
  await expect(page.getByTestId("pos-home-guard-no-register")).toBeVisible({ timeout: 20_000 });
}

export async function loginToPos(page: Page): Promise<void> {
  await page.goto("/login");
  const loginButtonVisible = await page
    .getByTestId("pos-login-submit")
    .isVisible({ timeout: 3_000 })
    .catch(() => false);

  if (loginButtonVisible) {
    await page.getByTestId("pos-login-email").fill("cashier@corely.test");
    await page.getByTestId("pos-login-password").fill("Password123!");

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await page.getByTestId("pos-login-submit").click();
      const homeGuardVisible = await page
        .getByTestId("pos-home-guard-no-register")
        .isVisible({ timeout: 4_000 })
        .catch(() => false);
      if (homeGuardVisible) {
        break;
      }
      await page.waitForTimeout(300);
    }
  }

  await expect(page.getByTestId("pos-home-guard-no-register")).toBeVisible({ timeout: 20_000 });
}

export async function selectRegister(page: Page): Promise<void> {
  await page.getByTestId("pos-home-select-register").click();
  await expect(page.getByTestId("pos-register-selection-screen")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId(`pos-register-item-${POS_IDS.registerId}`).click();
}

export async function openShiftFromGuard(page: Page): Promise<void> {
  await expect(page.getByTestId("pos-home-guard-open-shift")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("pos-home-open-shift").click();
  await expect(page.getByTestId("pos-shift-open-screen")).toBeVisible({ timeout: 20_000 });
}
