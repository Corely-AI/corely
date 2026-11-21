import { inspectTemplatePdf } from "./inspect-template-pdf";
import { createHash } from "node:crypto";
import { PDFDocument, rgb } from "pdf-lib";
import { SignLayoutSchema } from "@corely/contracts";
import { toPdfRectangle } from "./page-geometry";

// Local proof for trusted fixtures only. Never use the output as a signing artifact.
export async function renderLayoutProof(source: Uint8Array, input: unknown) {
  const layout = SignLayoutSchema.parse(input);
  if (source.length > 10 * 1024 * 1024) {
    throw new Error("PDF exceeds 10 MiB");
  }
  if (createHash("sha256").update(source).digest("hex") !== layout.document.sha256) {
    throw new Error("Layout belongs to a different PDF");
  }
  if ((await inspectTemplatePdf(Buffer.from(source))) !== layout.document.pageCount) {
    throw new Error("Page count mismatch");
  }
  const pdf = await PDFDocument.load(source, { throwOnInvalidObject: true, updateMetadata: false });
  if (pdf.getPageCount() !== layout.document.pageCount) {
    throw new Error("Page count mismatch");
  }
  const proof = await PDFDocument.create();
  for (const page of await proof.copyPages(pdf, pdf.getPageIndices())) {
    proof.addPage(page);
  }
  for (const field of layout.fields) {
    const page = proof.getPage(field.pageIndex);
    const box = toPdfRectangle(field.rect, page.getCropBox(), page.getRotation().angle);
    page.drawRectangle({
      ...box,
      borderColor: rgb(0.1, 0.35, 0.75),
      borderWidth: 1,
      color: rgb(0.4, 0.65, 1),
      opacity: 0.18,
    });
  }
  proof.setTitle("Corely Sign field placement proof");
  return proof.save();
}
