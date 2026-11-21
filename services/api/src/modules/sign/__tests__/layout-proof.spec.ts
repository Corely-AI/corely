import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { PDFDocument, degrees } from "pdf-lib";
import { moveSignField, resizeSignField, SignLayoutSchema, type SignLayout } from "@corely/contracts";
import { renderLayoutProof } from "../infrastructure/pdf/render-layout-proof";
import { toPdfRectangle } from "../infrastructure/pdf/page-geometry";

const rect = { x: 0.1, y: 0.2, width: 0.3, height: 0.4 };
const crop = { x: 10, y: 20, width: 100, height: 200 };
const layout: SignLayout = {
  schemaVersion: 1,
  document: { id: "original", sha256: "a".repeat(64), pageCount: 2 },
  roles: [{ id: "client", name: "Client" }],
  fields: [
    {
      id: "name",
      type: "signature",
      pageIndex: 1,
      documentId: "original",
      roleId: "client",
      required: true,
      rect,
    },
  ],
};

describe("template placement", () => {
  it("keeps the whole field inside the page while moving or resizing", () => {
    expect(moveSignField(rect, 10, -10)).toEqual({ ...rect, x: 0.7, y: 0 });
    expect(resizeSignField(rect, 10, -10)).toEqual({ ...rect, width: 0.9, height: 0.01 });
    const tiny = { x: 0.998, y: 0, width: 0.002, height: 0.002 };
    expect(resizeSignField(tiny, 0, 0)).toEqual(tiny);
  });
  it.each([
    [0, 20, 100, 30, 80],
    [90, 30, 40, 40, 60],
    [180, 70, 60, 30, 80],
    [270, 50, 140, 40, 60],
  ])("maps displayed rectangles on a %i degree crop", (angle, x, y, width, height) => {
    const result = toPdfRectangle(rect, crop, angle);
    expect(result.x).toBeCloseTo(x);
    expect(result.y).toBeCloseTo(y);
    expect(result.width).toBeCloseTo(width);
    expect(result.height).toBeCloseTo(height);
  });
  it.each([
    { roleId: "other" },
    { documentId: "other" },
    { pageIndex: 2 },
    { type: "code" },
    { rect: { ...rect, x: 0.9 } },
    { rect: { ...rect, x: NaN } },
    { rect: { ...rect, width: 0 } },
  ])("rejects invalid field %o", (change) => {
    expect(
      SignLayoutSchema.safeParse({ ...layout, fields: [{ ...layout.fields[0], ...change }] })
        .success
    ).toBe(false);
  });
  it("identifies each invalid reference on the affected field", () => {
    const field = layout.fields[0];
    const result = SignLayoutSchema.safeParse({
      ...layout,
      fields: [field, { ...field, roleId: "missing", documentId: "other", pageIndex: 2 }],
    });
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([
      ["fields", 1, "id"],
      ["fields", 1, "roleId"],
      ["fields", 1, "documentId"],
      ["fields", 1, "pageIndex"],
    ]);
  });
  it("rejects duplicate identities", () => {
    expect(
      SignLayoutSchema.safeParse({ ...layout, roles: [...layout.roles, ...layout.roles] }).success
    ).toBe(false);
    expect(
      SignLayoutSchema.safeParse({ ...layout, fields: [...layout.fields, ...layout.fields] })
        .success
    ).toBe(false);
  });
  it("renders a separate proof bound to the original two-page document", async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    const page = doc.addPage([300, 400]);
    page.setCropBox(10, 20, 100, 200);
    page.setRotation(degrees(90));
    const source = await doc.save();
    const bound = {
      ...layout,
      document: { ...layout.document, sha256: createHash("sha256").update(source).digest("hex") },
    };
    const proof = await PDFDocument.load(await renderLayoutProof(source, bound));
    expect(proof.getPageCount()).toBe(2);
    expect(proof.getPage(1).getCropBox()).toEqual(crop);
    expect(proof.getPage(1).getRotation().angle).toBe(90);
    expect(proof.getPage(1).node.Contents()).toBeDefined();
    await expect(renderLayoutProof(source, layout)).rejects.toThrow("different PDF");
    await expect(
      renderLayoutProof(source, { ...bound, document: { ...bound.document, pageCount: 3 } })
    ).rejects.toThrow("Page count");
  });
});
