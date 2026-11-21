import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

interface WorkspaceFixture {
  tenantId: string;
  workspaceId: string;
  invoiceId: string;
  existingInvoiceId: string;
  existingInvoiceNumber: string;
  customerId: string;
  accessToken: string;
  refreshToken: string;
}

const file = process.env.INVOICE_UPGRADE_STATE;
const fixtures = file
  ? (JSON.parse(readFileSync(file, "utf8")) as Record<"acme" | "standard", WorkspaceFixture>)
  : undefined;
const guidance = "Add a due date before finalizing this invoice.";

test.describe("Invoice customization on a disposable installation", () => {
  test.skip(!fixtures, "Requires provisioned local Invoice upgrade fixtures");

  for (const key of ["acme", "standard"] as const) {
    for (const width of [1280, 390]) {
      test(key + " invoice at " + width + "px", async ({ page, baseURL }, info) => {
        expect(["localhost", "127.0.0.1"]).toContain(new URL(baseURL!).hostname);
        const fixture = fixtures![key];
        await page.setViewportSize({ width, height: 880 });
        await page.addInitScript(({ accessToken, refreshToken, workspaceId }) => {
          localStorage.setItem("accessToken", accessToken);
          localStorage.setItem("refreshToken", refreshToken);
          localStorage.setItem("corely-active-workspace", workspaceId);
          localStorage.setItem("Corely One ERP-language", "en");
        }, fixture);

        const headers = {
          Authorization: "Bearer " + fixture.accessToken,
          "x-tenant-id": fixture.tenantId,
          "x-workspace-id": fixture.workspaceId,
        };
        const stored = await page.request.get("/api/invoices/" + fixture.existingInvoiceId, {
          headers,
        });
        expect(stored.ok()).toBeTruthy();
        expect((await stored.json()).invoice).toMatchObject({
          status: "ISSUED",
          number: fixture.existingInvoiceNumber,
          customerPartyId: fixture.customerId,
        });
        if (key === "acme") {
          const rejected = await page.request.post(
            "/api/invoices/" + fixture.invoiceId + "/finalize",
            {
              headers,
              data: {},
            }
          );
          expect(rejected.status()).toBe(400);
          expect(await rejected.json()).toMatchObject({
            code: "Invoices:FinalizationPolicyRejected",
          });
        }
        await page.goto("/invoices/" + fixture.invoiceId);
        await expect(page.getByTestId("invoice-line-description-0")).toHaveValue("Consulting");
        const note = page.getByText(guidance, { exact: true });
        if (key === "acme") {
          await expect(note).toBeVisible();
        } else {
          await expect(note).toHaveCount(0);
        }
        await page.screenshot({ path: info.outputPath("draft.png") });
      });
    }
  }
});
