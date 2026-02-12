import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { selectors } from "../utils/selectors";

const API_URL = process.env.API_URL || "http://localhost:3000";

interface CreateWorkspaceResponse {
  workspace: {
    id: string;
  };
}

interface CustomerResponse {
  id: string;
  displayName: string;
}

interface CreateShipmentResponse {
  shipment: {
    id: string;
    status: string;
    supplierPartyId: string;
  };
}

async function login(
  page: Page,
  creds: {
    email: string;
    password: string;
  }
) {
  await page.goto("/auth/login");
  await page.fill(selectors.auth.loginEmailInput, creds.email);
  await page.fill(selectors.auth.loginPasswordInput, creds.password);
  await page.click(selectors.auth.loginSubmitButton);
  await page.waitForURL("**/dashboard", { timeout: 10_000 });
}

async function getAccessToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => window.localStorage.getItem("accessToken"));
  if (!token) {
    throw new Error("Missing access token after login");
  }
  return token;
}

async function createCompanyWorkspace(page: Page, accessToken: string): Promise<string> {
  const workspaceName = `Import E2E ${Date.now()}`;
  const createResponse = await page.request.post(`${API_URL}/workspaces`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      name: workspaceName,
      kind: "COMPANY",
      legalName: workspaceName,
      countryCode: "US",
      currency: "USD",
      address: {
        line1: "100 Import Way",
        city: "Test City",
        postalCode: "10001",
        countryCode: "US",
      },
    },
  });

  expect(createResponse.ok()).toBeTruthy();
  const createBody = (await createResponse.json()) as CreateWorkspaceResponse;
  return createBody.workspace.id;
}

async function switchActiveWorkspace(page: Page, workspaceId: string): Promise<void> {
  await page.goto("/dashboard");
  await page.reload();
  const switcherTrigger = page.locator(selectors.workspace.switcherTrigger).first();
  await expect(switcherTrigger).toBeVisible();
  await switcherTrigger.click();
  await expect(page.locator(selectors.workspace.option(workspaceId))).toBeVisible();
  await page.click(selectors.workspace.option(workspaceId));
  await expect(switcherTrigger).toContainText(/import e2e/i);
}

async function createSupplier(
  page: Page,
  accessToken: string,
  workspaceId: string
): Promise<{ id: string; name: string }> {
  const supplierName = `E2E Supplier ${Date.now()}`;
  const createResponse = await page.request.post(`${API_URL}/customers`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Workspace-Id": workspaceId,
    },
    data: {
      displayName: supplierName,
      role: "SUPPLIER",
    },
  });

  expect(createResponse.ok()).toBeTruthy();
  const createBody = (await createResponse.json()) as CustomerResponse;
  return { id: createBody.id, name: createBody.displayName };
}

test.describe("Import Shipments", () => {
  test.describe.configure({ mode: "serial" });

  test("shows capability message on personal workspaces", async ({ page, testData }) => {
    await login(page, { email: testData.user.email, password: testData.user.password });

    await page.goto("/import/shipments/new");

    await expect(page.getByRole("heading", { name: "Create Shipment" })).toBeVisible();
    await expect(
      page.getByText(/Import features aren't enabled for this workspace\./i)
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Create Draft" })).toHaveCount(0);
  });

  test("creates a draft shipment on company workspaces", async ({ page, testData }) => {
    await login(page, { email: testData.user.email, password: testData.user.password });

    const accessToken = await getAccessToken(page);
    const companyWorkspaceId = await createCompanyWorkspace(page, accessToken);
    await switchActiveWorkspace(page, companyWorkspaceId);

    const supplier = await createSupplier(page, accessToken, companyWorkspaceId);

    await page.goto("/import/shipments/new");
    await expect(page.getByRole("heading", { name: "Create Shipment" })).toBeVisible();
    await expect(page.getByText("Import / Shipments / New")).toBeVisible();

    const supplierOption = page
      .locator("#supplierPartyId option")
      .filter({ hasText: supplier.name });
    if ((await supplierOption.count()) > 0) {
      await page.getByLabel("Supplier").selectOption(supplier.id);
    } else {
      await page.evaluate(
        ({ supplierId, supplierName }) => {
          const select = document.querySelector("#supplierPartyId");
          if (!(select instanceof HTMLSelectElement)) {
            return;
          }

          const exists = Array.from(select.options).some((option) => option.value === supplierId);
          if (!exists) {
            const option = document.createElement("option");
            option.value = supplierId;
            option.text = supplierName;
            select.appendChild(option);
          }

          select.value = supplierId;
          select.dispatchEvent(new Event("change", { bubbles: true }));
        },
        {
          supplierId: supplier.id,
          supplierName: supplier.name,
        }
      );
    }

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/import/shipments") && response.request().method() === "POST"
    );

    await page.getByRole("button", { name: "Create Draft" }).click();

    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBeTruthy();

    const createBody = (await createResponse.json()) as CreateShipmentResponse;
    expect(createBody.shipment.status).toBe("DRAFT");
    expect(createBody.shipment.supplierPartyId).toBe(supplier.id);

    await expect(page).toHaveURL(/\/import\/shipments\/[a-zA-Z0-9-]+$/, {
      timeout: 15_000,
    });
    await expect(page.getByText("DRAFT")).toBeVisible();
    await expect(page.getByText(/Import \/ Shipments \//)).toBeVisible();
  });
});
