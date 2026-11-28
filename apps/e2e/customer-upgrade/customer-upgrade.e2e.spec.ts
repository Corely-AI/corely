import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

interface WorkspaceFixture {
  tenantId: string;
  workspaceId: string;
  existingId: string;
  accessToken: string;
  refreshToken: string;
}

const file = process.env.CUSTOMER_UPGRADE_STATE;
const fixtures = file
  ? (JSON.parse(readFileSync(file, "utf8")) as Record<"acme" | "standard", WorkspaceFixture>)
  : undefined;

test.describe("Customers upgrade", () => {
  test.skip(!fixtures, "Requires provisioned local customer fixtures");
  for (const key of ["acme", "standard"] as const) {
    for (const width of [1280, 390]) {
      test(key + " customer editor at " + width + "px", async ({ page, baseURL }, info) => {
        expect(["localhost", "127.0.0.1"]).toContain(new URL(baseURL!).hostname);
        const state = fixtures![key];
        await page.setViewportSize({ width, height: 880 });
        await page.addInitScript(({ accessToken, refreshToken, workspaceId }) => {
          localStorage.setItem("accessToken", accessToken);
          localStorage.setItem("refreshToken", refreshToken);
          localStorage.setItem("corely-active-workspace", workspaceId);
          localStorage.setItem("Corely One ERP-language", "en");
        }, state);
        const headers = {
          Authorization: "Bearer " + state.accessToken,
          "x-tenant-id": state.tenantId,
          "x-workspace-id": state.workspaceId,
        };
        const existing = await page.request.get("/api/customers/" + state.existingId, { headers });
        expect(existing.ok()).toBeTruthy();
        expect(await existing.json()).toMatchObject({
          id: state.existingId,
          organizationName: "Existing Customer GmbH",
        });
        await page.goto("/customers/new");
        await page.getByLabel("Customer type").selectOption("ORGANIZATION");
        await expect(page.getByLabel("Organization name")).toBeVisible();
        const guidance = page.getByText("Enter the registered organization name.", { exact: true });
        if (key === "acme") {
          await expect(guidance).toBeVisible();
          const rejected = await page.request.post("/api/customers", {
            headers,
            data: { displayName: "Rejected Organization", kind: "ORGANIZATION" },
          });
          expect(rejected.status()).toBe(400);
          expect(await rejected.json()).toMatchObject({ code: "Customers:CreationPolicyRejected" });
        } else {
          await expect(guidance).toHaveCount(0);
        }
        await page.screenshot({ path: info.outputPath("customer-editor.png") });
      });
    }
  }
});
