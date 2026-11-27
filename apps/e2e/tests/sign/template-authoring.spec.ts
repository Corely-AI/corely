import { test, expect, type Page } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { SignDraft } from "@corely/contracts";

async function mockSigningApi(page: Page) {
  let draft: SignDraft | undefined,
    source: string | null = null,
    publication = 0,
    sourceAttempts = 0;
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
  await page.route("**/api/**", async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname.replace(/^\/api/, "");
    if (path === "/sign/requests" && request.method() === "POST") {
      const payload = request.postDataJSON();
      expect(payload.recipients.map((r: { roleId: string }) => r.roleId)).toEqual(
        draft?.layout.roles.map((role) => role.id)
      );
      await route.fulfill({
        json: {
          ...payload,
          requestId: "10000000-0000-4000-8000-000000000001",
          title: draft?.title,
          canonicalSha256: draft?.layout.document.sha256,
          status: "DRAFT",
        },
      });
      return;
    }
    if (!path.startsWith("/sign/templates")) {
      await route.fulfill({ status: 404, json: {} });
      return;
    }
    expect(request.headers()["x-workspace-id"]).toBe("fixture-workspace");
    const parts = path.split("/");
    if (parts.length === 3) {
      await route.fulfill({ json: { items: draft ? [draft] : [], nextCursor: null } });
      return;
    }
    if (parts[4] === "source") {
      if (request.method() === "PUT") {
        sourceAttempts++;
        if (sourceAttempts === 1) {
          await route.fulfill({
            status: 409,
            json: { title: "Source upload interrupted", detail: "Source upload interrupted" },
          });
          return;
        }
        source = request.postDataJSON().base64;
      }
      await route.fulfill({ json: { base64: source } });
      return;
    }
    if (parts[4] === "versions") {
      expect(source).toBeTruthy();
      expect(Number(parts[5])).toBe(draft?.revision);
      publication++;
      await route.fulfill({
        json: {
          templateId: parts[3],
          revision: Number(parts[5]),
          originalSha256: draft?.layout.document.sha256,
          canonicalSha256: draft?.layout.document.sha256,
          profile: "static-pdf-v1",
        },
      });
      return;
    }
    if (request.method() === "PUT") {
      const body = request.postDataJSON();
      expect(body.expectedRevision).toBe(draft?.revision ?? 0);
      draft = {
        archived: false,
        templateId: parts[3],
        revision: body.expectedRevision + 1,
        title: body.title,
        layout: body.layout,
      };
    }
    await route.fulfill({ json: draft });
  });
  return {
    get source() {
      return source;
    },
    get draft() {
      return draft;
    },
    get publication() {
      return publication;
    },
    get sourceAttempts() {
      return sourceAttempts;
    },
  };
}
test("prepare two-page template, persist source, reopen and publish a particular revision", async ({
  page,
}, info) => {
  const fixture = await mockSigningApi(page);
  await page.goto("/sign/templates/new");
  await page
    .getByLabel("PDF document")
    .setInputFiles(fileURLToPath(new URL("./sample-agreement.pdf", import.meta.url)));
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("button", { name: "Add field", exact: true }).click();
  await page.getByLabel("X (%)", { exact: true }).fill("25");
  await page.getByLabel("Y (%)", { exact: true }).fill("39");
  const placement = page.locator("[data-sign-page] button[aria-pressed=true]");
  await placement.press("ArrowRight");
  await expect(page.getByLabel("X (%)", { exact: true })).toHaveValue("26");
  await placement.press("Shift+ArrowRight");
  await expect(page.getByLabel("Width (%)", { exact: true })).toHaveValue("25");
  await placement.press("ArrowLeft");
  await page.screenshot({ path: info.outputPath("desktop.png") });
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Add role", exact: true }).click();
  await page.getByRole("button", { name: "Add field", exact: true }).click();
  await page.getByRole("button", { name: "Save workspace draft" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Save workspace draft" }).click();
  await page.getByRole("link", { name: "Open saved revision 1" }).click();
  expect(fixture.sourceAttempts).toBe(2);
  await expect(page.locator("canvas")).toBeVisible();
  expect(fixture.draft?.layout.fields).toHaveLength(2);
  await expect(
    page.getByRole("button", { name: "Signature for Signer", exact: true })
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Publish saved revision" }).click();
  await expect(page.getByRole("button", { name: "Published revision 1" })).toBeDisabled();
  expect(fixture.publication).toBe(1);
  await page.getByRole("button", { name: "Prepare a request" }).click();
  await page.getByLabel("Recipient name").nth(0).fill("Sample signer A");
  await page.getByLabel("Recipient email").nth(0).fill("a@example.invalid");
  await page.getByLabel("Recipient name").nth(1).fill("Sample signer B");
  await page.getByLabel("Recipient email").nth(1).fill("b@example.invalid");
  await page.getByRole("button", { name: "Save request draft" }).click();
  await expect(page.getByRole("link", { name: "Open request draft" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Preview selected role").check();
  await page
    .getByRole("combobox", { name: "Signer role", exact: true })
    .selectOption({ label: "Signer 2" });
  await expect(
    page.getByRole("button", { name: "Signature for Signer 2", exact: true })
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath("mobile.png"), fullPage: true });
});

test("upload a PDF for a request and review the edited revision after an interrupted upload", async ({
  page,
}) => {
  const fixture = await mockSigningApi(page);
  await page.goto("/sign/requests/new");
  await page.getByLabel(/Import this PDF as page images/).check();
  await page
    .getByLabel("PDF document")
    .setInputFiles(fileURLToPath(new URL("./sample-agreement.pdf", import.meta.url)));
  await expect(page.locator("canvas")).toBeVisible();
  const next = page.getByRole("button", { name: "Continue to recipients" });
  await expect(next).toBeDisabled();
  await page.getByRole("button", { name: "Add field", exact: true }).click();
  const type = page.getByLabel("Selected field type");
  await type.selectOption("text");
  await expect(next).toBeDisabled();
  await type.selectOption("signature");
  await next.click();
  await expect(page.getByRole("alert")).toContainText("Source upload interrupted");
  await next.click();
  await expect(page.getByRole("heading", { name: "Recipients", exact: true })).toBeVisible();
  expect(fixture.draft?.revision).toBe(1);
  const original = await readFile(new URL("./sample-agreement.pdf", import.meta.url));
  const uploaded = Buffer.from(fixture.source ?? "", "base64");
  expect(uploaded.equals(original)).toBe(false);
  expect(createHash("sha256").update(uploaded).digest("hex")).toBe(
    fixture.draft?.layout.document.sha256
  );
  expect(fixture.draft?.layout.document.pageCount).toBe(2);
  expect(fixture.publication).toBe(1);
  await page.getByLabel("Recipient name").fill("Test signer");
  await page.getByLabel("Recipient email").fill("test@example.invalid");
  await page.getByRole("button", { name: "Review request" }).click();
  await expect(page).toHaveURL(/\/sign\/requests\/10000000-0000-4000-8000-000000000001$/);
});

test("keeps signing controls and PDF scrolling within the editor layout", async ({
  page,
}, info) => {
  await mockSigningApi(page);
  await page.setViewportSize({ width: 1180, height: 1000 });
  await page.goto("/sign/requests/new");
  const filename = "SampleAgreement".repeat(4) + ".pdf";
  await page.getByLabel("PDF document").setInputFiles({
    name: filename,
    mimeType: "application/pdf",
    buffer: await readFile(new URL("./sample-agreement.pdf", import.meta.url)),
  });
  const canvas = page.getByLabel("PDF page 1", { exact: true });
  await expect(canvas).toBeVisible();

  const signerRole = page.getByRole("combobox", { name: "Signer role", exact: true });
  await expect(signerRole).toBeVisible();
  await signerRole.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("request-layout-desktop.png") });
  const preview = page.locator("[data-sign-page]");
  const scrollArea = preview.locator("..");
  const previewBounds = (await scrollArea.boundingBox())!;
  const titleBounds = (await page.getByLabel("Document title").boundingBox())!;
  const roleBounds = (await signerRole.boundingBox())!;
  const typeBounds = (await page
    .getByRole("combobox", { name: "Field type", exact: true })
    .boundingBox())!;
  expect(titleBounds.x + titleBounds.width).toBeLessThan(previewBounds.x);
  expect(roleBounds.x + roleBounds.width).toBeLessThan(previewBounds.x);
  expect(typeBounds.x + typeBounds.width).toBeLessThan(previewBounds.x);

  await page.getByRole("button", { name: "Add role" }).click();
  await expect(signerRole.getByRole("option", { name: "Signer 2" })).toHaveJSProperty(
    "selected",
    true
  );
  await canvas.click({ position: { x: 80, y: 160 } });
  const signature = page.getByRole("button", { name: "Signature for Signer 2", exact: true });
  await expect(signature).toBeVisible();
  const xPosition = page.getByLabel("X (%)", { exact: true });
  const xBounds = (await xPosition.boundingBox())!;
  expect(xBounds.x + xBounds.width).toBeLessThan(previewBounds.x);
  await xPosition.fill("25");
  await expect(xPosition).toHaveValue("25");
  await page.screenshot({ path: info.outputPath("request-layout-desktop-field.png") });

  await page.setViewportSize({ width: 390, height: 844 });
  const zoom = page.getByRole("combobox", { name: "Zoom", exact: true });
  await zoom.selectOption("150");
  expect(
    await scrollArea.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
      return element.scrollLeft;
    })
  ).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await zoom.selectOption("100");
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toBeInViewport();
  await page.screenshot({ path: info.outputPath("request-layout-mobile.png"), fullPage: true });

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save layout", exact: true }).click();
  const layoutFile = await (await download).path();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(signature).toHaveCount(0);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByLabel("Restore layout", { exact: true }).setInputFiles(layoutFile);
  await expect(signature).toBeVisible();
});
