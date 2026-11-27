import { expect, test } from "@playwright/test";
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
    let expiresAt: string | null = null;
    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (/\/sign\/requests\/[^/]+\/progress$/.test(path) && request.method() === "GET") {
        await route.fulfill({
          json: {
            status: expiresAt ? "SENT" : "DRAFT",
            expiresAt,
            recipients: expiresAt
              ? [{ roleId: "signer", status: "INVITED", deliveredAt: null, acceptedAt: null }]
              : [],
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
    const confirmation = page.getByRole("alertdialog", { name: "Confirm sending" });
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
      "Send signing invitations to the recipients listed above?"
    );
    const cancel = confirmation.getByRole("button", { name: "Cancel" });
    await expect(cancel).toBeFocused();
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
    expect(sendCommands.size).toBe(2);
  });
}
