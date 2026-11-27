import { describe, expect, it } from "vitest";
import { PDFDocument, PDFName } from "pdf-lib";
import { inspectTemplatePdf } from "../infrastructure/pdf/inspect-template-pdf";

async function taggedListPdf(attributes: Record<string, string>): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage();
  const { context } = pdf;
  const structureRoot = context.obj({ Type: "StructTreeRoot" });
  const rootRef = context.register(structureRoot);
  const list = context.register(
    context.obj({
      Type: "StructElem",
      S: "L",
      P: rootRef,
      Pg: page.ref,
      A: context.register(context.obj(attributes)),
    })
  );
  structureRoot.set(PDFName.of("K"), context.obj([list]));
  pdf.catalog.set(PDFName.of("StructTreeRoot"), rootRef);
  pdf.catalog.set(PDFName.of("MarkInfo"), context.obj({ Marked: true }));
  return Buffer.from(await pdf.save());
}

describe("isolated static PDF inspection", () => {
  it("accepts a two-page static PDF", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    pdf.addPage();
    expect(await inspectTemplatePdf(Buffer.from(await pdf.save()))).toBe(2);
  });
  it("accepts a static PDF with tagged list numbering", async () => {
    const pdf = await taggedListPdf({ O: "List", ListNumbering: "None" });
    await expect(inspectTemplatePdf(pdf)).resolves.toBe(1);
  });
  it("rejects action entries in a tagged list attribute dictionary", async () => {
    const pdf = await taggedListPdf({
      O: "List",
      ListNumbering: "None",
      S: "Named",
      N: "NextPage",
    });
    await expect(inspectTemplatePdf(pdf)).rejects.toThrow("static");
  });
  it.each(["A", "AcroForm", "ByteRange", "EmbeddedFiles", "OpenAction"])(
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
