import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`confirms signing invitations in the app on ${viewport.name}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const entry = fileURLToPath(new URL("./browser-fixture.tsx", import.meta.url)).replaceAll(
      "\\",
      "/"
    );
    await page.route("**/src/main.tsx*", (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: "import " + JSON.stringify("/@fs/" + entry),
      })
    );

    const sendCommands = new Set<string>();
    const pdf = await readFile(new URL("./sample-agreement.pdf", import.meta.url));
    let expiresAt: string | null = null;
    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (/\/sign\/requests\/[^/]+\/progress$/.test(path) && request.method() === "GET") {
        await route.fulfill({
          json: {
            status: expiresAt ? "SENT" : "DRAFT",
            expiresAt,
            sentAt: expiresAt ? "2026-11-27T10:00:00.000Z" : null,
            recipients: expiresAt
              ? [
                  {
                    roleId: "signer",
                    status: "INVITED",
                    deliveredAt: "2026-11-27T10:00:02.000Z",
                    acceptedAt: null,
                  },
                  { roleId: "reviewer", status: "WAITING", deliveredAt: null, acceptedAt: null },
                ]
              : [],
          },
        });
      } else if (path.endsWith("/source") && request.method() === "GET") {
        await route.fulfill({
          json: {
            base64: pdf.toString("base64"),
            sha256: "a".repeat(64),
            fields: [
              {
                id: "fixture-field",
                type: "signature",
                roleId: "signer",
                documentId: "pdf",
                pageIndex: 0,
                rect: { x: 0.2, y: 0.4, width: 0.45, height: 0.1 },
                required: true,
              },
              {
                id: "second-field",
                type: "initials",
                roleId: "reviewer",
                documentId: "pdf",
                pageIndex: 0,
                rect: { x: 0.2, y: 0.6, width: 0.45, height: 0.1 },
                required: true,
              },
            ],
          },
        });
      } else if (/\/sign\/requests\/[^/]+\/send$/.test(path) && request.method() === "POST") {
        const command = request.headers()["x-idempotency-key"] ?? "";
        expect(command).not.toBe("");
        sendCommands.add(command);
        expect(request.headers()["x-workspace-id"]).toBe("fixture-workspace");
        expect(request.postDataJSON()).toEqual({
          confirm: true,
          expiresAt: expectedExpiry,
          consent: "I agree to sign this sample document.",
          invitation: "Please review and sign.",
          canonicalSha256: "a".repeat(64),
        });
        if (sendCommands.size === 1) {
          await route.fulfill({
            status: 503,
            json: {
              type: "about:blank",
              title: "Service unavailable",
              status: 503,
              detail: "Signing is temporarily unavailable",
            },
          });
        } else {
          expiresAt = expectedExpiry;
          await route.fulfill({ status: 204 });
        }
      } else {
        await route.fulfill({ status: 404, json: {} });
      }
    });

    await page.goto("/sign/requests/confirmation-fixture");
    const reviewButton = page.getByRole("button", { name: "Review and send invitations" });
    const confirmation = page.getByRole("alertdialog", { name: "Review and send invitations" });
    const expectedExpiry =
      (await page.getByLabel("Expires on (UTC)").inputValue()) + "T23:59:59.000Z";
    const consent = page.getByLabel("Consent statement for recipients");
    await reviewButton.click();
    await expect(consent).toBeFocused();
    await expect(confirmation).toHaveCount(0);

    await consent.fill("I agree to sign this sample document.");
    await page.getByLabel("Invitation message").fill("Please review and sign.");
    await reviewButton.click();
    await expect(confirmation).toHaveAccessibleDescription(
      "Check the document and recipient details before sending."
    );
    const cancel = confirmation.getByRole("button", { name: "Cancel" });
    await expect(cancel).toBeFocused();
    await expect(
      confirmation.getByText("Recipients are invited in the order shown.")
    ).toBeVisible();
    await expect(confirmation.getByText("jamie@example.test", { exact: true })).toBeVisible();
    await expect(confirmation.getByText("Please review and sign.", { exact: true })).toBeVisible();
    await expect(confirmation.getByText("I agree to sign this sample document.")).toBeVisible();
    const recipientPreview = confirmation.getByLabel("Preview for recipient");
    await expect(confirmation.getByLabel("PDF page 1")).toBeVisible();
    await expect(
      confirmation.getByRole("button", { name: /signature.*Jamie Example/i })
    ).toBeVisible();
    await recipientPreview.selectOption("reviewer");
    await expect(
      confirmation.getByRole("button", { name: /initials.*Avery Example/i })
    ).toBeVisible();
    await expect(
      confirmation.getByRole("button", { name: /signature.*Jamie Example/i })
    ).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath("send-confirmation.png"),
      animations: "disabled",
    });
    await cancel.click();
    await expect(confirmation).toHaveCount(0);
    await expect(reviewButton).toBeFocused();
    await expect(consent).toHaveValue("I agree to sign this sample document.");

    await reviewButton.press("Enter");
    await expect(cancel).toBeFocused();
    await expect(confirmation).toHaveCSS("pointer-events", "auto");
    await cancel.press("Escape");
    await expect(confirmation).toHaveCount(0);
    await expect(reviewButton).toBeFocused();
    expect(sendCommands.size).toBe(0);

    await reviewButton.click();
    const send = confirmation.getByRole("button", { name: "Send invitations" });
    await send.click();
    await expect(confirmation).toHaveCount(0);
    await expect(page.getByRole("alert")).toHaveText("Service Unavailable");
    await expect(page.getByText("Status · Draft")).toBeVisible();

    await reviewButton.click();
    await send.click();
    await expect(page.getByText("Status · Waiting for signatures")).toBeVisible();
    const first = page.getByRole("listitem").filter({ hasText: "jamie@example.test" });
    const second = page.getByRole("listitem").filter({ hasText: "avery@example.test" });
    await expect(first.getByText("Needs to sign")).toBeVisible();
    await expect(first.getByText("Sent to email provider")).toBeVisible();
    await expect(second.getByText("Waiting for prior signer")).toBeVisible();
    await expect(second.getByRole("button", { name: "Send reminder" })).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath("recipient-progress.png"),
      animations: "disabled",
    });
    await first.getByRole("button", { name: "Send reminder" }).click();
    const reminder = page.getByRole("alertdialog", { name: "Send reminder" });
    await expect(reminder).toHaveAccessibleDescription(
      /jamie@example.test.*revoke the previous link/
    );
    await reminder.getByRole("button", { name: "Cancel" }).click();
    expect(sendCommands.size).toBe(2);
  });
}
