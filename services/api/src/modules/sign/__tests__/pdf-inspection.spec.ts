import { describe, expect, it } from "vitest";
import { PDFDocument, PDFName } from "pdf-lib";
import { inspectTemplatePdf } from "../infrastructure/pdf/inspect-template-pdf";
describe("isolated static PDF inspection", () => {
  it("accepts a two-page static PDF", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    pdf.addPage();
    expect(await inspectTemplatePdf(Buffer.from(await pdf.save()))).toBe(2);
  });
  it.each(["AcroForm", "ByteRange", "EmbeddedFiles", "OpenAction"])(
    "rejects a document containing %s",
    async (key) => {
      const pdf = await PDFDocument.create();
      pdf.addPage();
      pdf.catalog.set(PDFName.of(key), pdf.context.obj({}));
      await expect(inspectTemplatePdf(Buffer.from(await pdf.save()))).rejects.toThrow("static");
    }
  );
  it("rejects invalid bytes", async () => {
    await expect(inspectTemplatePdf(Buffer.from("invalid"))).rejects.toThrow("Invalid");
  });
});
