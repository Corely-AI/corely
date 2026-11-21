import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { PDFDocument } from "pdf-lib";

/** Render inert pages using the same rotated crop box as the field editor. */
export async function createStaticPdfCopy(file: File, signal: AbortSignal): Promise<File> {
  const bytes = await file.arrayBuffer();
  signal.throwIfAborted();
  const task = getDocument({ data: bytes, stopAtErrors: true });
  const cancel = () => void task.destroy();
  signal.addEventListener("abort", cancel, { once: true });
  try {
    const source = await task.promise;
    if (source.numPages > 100) throw new Error("Choose a PDF with at most 100 pages.");
    const { info } = await source.getMetadata();
    if ("EncryptFilterName" in info && info.EncryptFilterName)
      throw new Error("Choose an unencrypted PDF.");
    if ("IsSignaturesPresent" in info && info.IsSignaturesPresent)
      throw new Error("Choose the unsigned original document.");
    if ("IsXFAPresent" in info && info.IsXFAPresent)
      throw new Error("Export the completed XFA form as a static PDF before uploading.");
    const copy = await PDFDocument.create();
    let totalBytes = 0;
    for (let number = 1; number <= source.numPages; number++) {
      signal.throwIfAborted();
      const page = await source.getPage(number);
      const { width, height } = page.getViewport({ scale: 1 });
      if (!(width > 0 && height > 0 && width <= 14400 && height <= 14400))
        throw new Error("This PDF has unsupported page dimensions.");
      const viewport = page.getViewport({ scale: Math.min(2, 2000 / Math.max(width, height)) });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.ceil(viewport.width));
      canvas.height = Math.max(1, Math.ceil(viewport.height));
      try {
        await page.render({ canvas, viewport, background: "white" }).promise;
        const jpeg = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("Cannot render PDF page."))),
            "image/jpeg",
            0.9
          )
        );
        totalBytes += jpeg.size;
        if (totalBytes > 10 * 1024 * 1024) throw new Error("The static copy exceeds 10 MiB.");
        const image = await copy.embedJpg(await jpeg.arrayBuffer());
        copy.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height });
      } finally {
        canvas.width = canvas.height = 0;
        page.cleanup();
      }
    }
    const output = await copy.save();
    if (output.byteLength > 10 * 1024 * 1024) throw new Error("The static copy exceeds 10 MiB.");
    return new File([new Uint8Array(output)], file.name, { type: "application/pdf" });
  } finally {
    signal.removeEventListener("abort", cancel);
    await task.destroy();
  }
}
