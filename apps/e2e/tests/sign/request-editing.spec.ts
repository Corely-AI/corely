import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { SignLayout, SignRequestDraft, UpdateSignRequestDraft } from "@corely/contracts";

const draftId = "10000000-0000-4000-8000-000000000005";
const replacementId = "10000000-0000-4000-8000-000000000006";
const requestPath = "/sign/requests/" + draftId;
const sha = "a".repeat(64);
const layout: SignLayout = {
  schemaVersion: 1,
  document: { id: "pdf", sha256: sha, pageCount: 2 },
  roles: [{ id: "signer", name: "Signer 1" }],
  fields: [
    {
      id: "original-signature",
      documentId: "pdf",
      roleId: "signer",
      type: "signature",
      pageIndex: 0,
      required: true,
      rect: { x: 0.2, y: 0.45, width: 0.35, height: 0.08 },
    },
  ],
};
const fixtureDraft: SignRequestDraft = {
  requestId: draftId,
  templateId: "10000000-0000-4000-8000-000000000003",
  templateRevision: 1,
  title: "Sample service agreement",
  canonicalSha256: sha,
  routing: "parallel",
  recipients: [{ roleId: "signer", name: "Signer 1", email: "first@example.test" }],
  status: "DRAFT",
};
const entry = fileURLToPath(new URL("./browser-fixture.tsx", import.meta.url)).replaceAll(
  "\\",
  "/"
);
const expiryDay = new Date(Date.now() + 28 * 86400000).toISOString().slice(0, 10);

test.beforeEach(async ({ page }) => {
  await page.route("**/src/main.tsx*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "import " + JSON.stringify("/@fs/" + entry),
    })
  );
});

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(
    "edits signer names, color-coded fields, and settings at width " + viewport.width,
    async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      let draft = fixtureDraft;
      let saveCount = 0;
      const sendCommands: unknown[] = [];
      const pdf = await readFile(new URL("./sample-agreement.pdf", import.meta.url));
      await page.route("**/api" + requestPath + "**", async (route) => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        if (request.method() === "PUT") {
          const input: UpdateSignRequestDraft = request.postDataJSON();
          expect(request.headers()["x-workspace-id"]).toBe("fixture-workspace");
          expect(input.expectedRevision).toBe(0);
          expect(input.layout.fields).toContainEqual(
            expect.objectContaining({
              roleId: input.recipients[0].roleId,
              pageIndex: 1,
              type: "signature",
              required: true,
            })
          );
          draft = {
            ...draft,
            routing: input.routing,
            recipients: input.recipients,
            configuration: { revision: 1, layout: input.layout, settings: input.settings },
          };
          saveCount++;
          await route.fulfill({ json: draft });
        } else if (path.endsWith("/progress")) {
          await route.fulfill({
            json: {
              status: sendCommands.length > 0 ? "SENT" : "DRAFT",
              expiresAt: null,
              recipients: [],
            },
          });
        } else if (path.endsWith("/source")) {
          const revision = draft.configuration;
          await route.fulfill({
            json: {
              base64: pdf.toString("base64"),
              sha256: sha,
              layout: revision?.layout ?? layout,
              fields: (revision?.layout ?? layout).fields,
              draftRevision: revision?.revision ?? 0,
            },
          });
        } else if (path.endsWith("/send")) {
          sendCommands.push(request.postDataJSON());
          await route.fulfill({ status: 204 });
        } else {
          await route.fulfill({ json: draft });
        }
      });

      await page.goto(requestPath);
      await page.getByRole("button", { name: "Edit draft" }).click();
      await page.getByLabel("Recipient name").fill("Jordan Example");
      await page.getByRole("button", { name: "Add signer" }).click();
      await page.getByLabel("Recipient name").nth(1).fill("Avery Example");
      await page.getByLabel("Recipient email").nth(1).fill("second@example.test");
      await page.getByLabel("Signing order").selectOption("sequential");
      const secondRow = page.getByRole("listitem").filter({ hasText: "Avery Example" });
      const firstMark = page
        .getByRole("listitem")
        .filter({ hasText: "Jordan Example" })
        .locator("span[aria-hidden=true]");
      const secondMark = secondRow.locator("span[aria-hidden=true]");
      const firstColor = await firstMark.evaluate(
        (element) => getComputedStyle(element).backgroundColor
      );
      const secondColor = await secondMark.evaluate(
        (element) => getComputedStyle(element).backgroundColor
      );
      expect(firstColor).not.toBe(secondColor);
      await secondRow.getByRole("button", { name: "Move earlier" }).click();
      await expect(secondMark).toHaveCSS("background-color", secondColor);
      await page.screenshot({
        path: testInfo.outputPath("edit-recipients.png"),
        animations: "disabled",
      });
      await page.getByRole("button", { name: "Place fields", exact: true }).click();
      await expect(page.getByText("Place a required signature for Avery Example.")).toBeVisible();
      await expect(
        page.getByRole("button", { name: /signature.*Jordan Example/i }).locator("..")
      ).toHaveCSS("border-top-color", firstColor);
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await expect(page.getByLabel("PDF page 2")).toBeVisible();
      await page.getByRole("button", { name: "Add field", exact: true }).click();
      const added = page.getByRole("button", { name: /signature.*Avery Example/i });
      await expect(added.locator("..")).toHaveCSS("border-top-color", secondColor);
      await added.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: testInfo.outputPath("edit-fields.png"),
        animations: "disabled",
      });
      await page.getByRole("button", { name: "Request settings", exact: true }).click();
      await page.getByLabel("Expires on (UTC)").fill(expiryDay);
      await page.getByLabel("Invitation message").fill("Please review the edited agreement.");
      await page
        .getByLabel("Consent statement for recipients")
        .fill("I agree to sign the updated agreement.");
      await page.getByRole("button", { name: "Save draft", exact: true }).click();
      await expect(page.getByText("second@example.test", { exact: true })).toBeVisible();
      expect(saveCount).toBe(1);
      expect(sendCommands).toHaveLength(0);

      await page.reload();
      await expect(page.getByText("1. Avery Example", { exact: true })).toBeVisible();
      await expect(page.getByLabel("Expires on (UTC)")).toHaveValue(expiryDay);
      await page.getByRole("button", { name: "Review and send invitations" }).click();
      const review = page.getByRole("alertdialog");
      await expect(review.getByText("Please review the edited agreement.")).toBeVisible();
      await review.getByRole("button", { name: "Next", exact: true }).click();
      await expect(
        review.getByRole("button", { name: /signature.*Avery Example/i }).locator("..")
      ).toHaveCSS("border-top-color", secondColor);
      await review.getByRole("button", { name: "Send invitations" }).click();
      await expect(page.getByText("Status · Waiting for signatures")).toBeVisible();
      expect(sendCommands).toEqual([
        {
          confirm: true,
          expiresAt: expiryDay + "T23:59:59.000Z",
          consent: "I agree to sign the updated agreement.",
          invitation: "Please review the edited agreement.",
          canonicalSha256: sha,
          draftRevision: 1,
        },
      ]);
    }
  );
}

test("prepares a linked replacement and requires a separate send confirmation", async ({
  page,
}) => {
  const pdf = await readFile(new URL("./sample-agreement.pdf", import.meta.url));
  const replacement = {
    ...fixtureDraft,
    requestId: replacementId,
    replacesRequestId: draftId,
    configuration: {
      revision: 1,
      layout,
      settings: {
        expiresAt: expiryDay + "T23:59:59.000Z",
        invitation: "Replacement invitation",
        consent: "I agree.",
      },
    },
  };
  const commands: unknown[] = [];
  await page.route("**/api/sign/requests/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith("/replacement")) {
      await route.fulfill({ json: replacement });
    } else if (path.endsWith("/send")) {
      commands.push(request.postDataJSON());
      await route.fulfill({ status: 204 });
    } else if (path.endsWith("/progress")) {
      await route.fulfill({
        json: {
          status: !path.includes(replacementId) || commands.length > 0 ? "SENT" : "DRAFT",
          expiresAt: null,
          recipients: [],
        },
      });
    } else if (path.endsWith("/source")) {
      await route.fulfill({
        json: {
          base64: pdf.toString("base64"),
          sha256: sha,
          layout,
          fields: layout.fields,
          draftRevision: 1,
        },
      });
    } else {
      await route.fulfill({ json: path.includes(replacementId) ? replacement : fixtureDraft });
    }
  });
  await page.goto(requestPath);
  await page.getByRole("button", { name: "Create replacement draft" }).click();
  await expect(page).toHaveURL("/sign/requests/" + replacementId);
  await expect(page.getByRole("link", { name: "Open original request" })).toHaveAttribute(
    "href",
    requestPath
  );
  expect(commands).toHaveLength(0);
  await page.getByRole("button", { name: "Review and send invitations" }).click();
  const review = page.getByRole("alertdialog");
  await expect(review).toHaveAccessibleDescription(/disables its old links/);
  await review.getByRole("button", { name: "Send replacement" }).click();
  await expect(page.getByText("Status · Waiting for signatures")).toBeVisible();
  expect(commands).toEqual([
    expect.objectContaining({ confirmReplacement: true, draftRevision: 1 }),
  ]);
});
