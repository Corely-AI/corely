const { PDFDocument, StandardFonts, degrees } = require("pdf-lib");
const { pdflibAddPlaceholder } = require("@signpdf/placeholder-pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
const { toPdfRectangle } = require("./page-geometry.cjs");

async function render({ source, layout, evidence, fontBytes, preview }) {
  const pdf = await PDFDocument.load(source, {
    updateMetadata: false,
    throwOnInvalidObject: true,
  });
  if (fontBytes) pdf.registerFontkit(fontkit);
  const font = fontBytes
    ? await pdf.embedFont(fontBytes, { subset: true })
    : await pdf.embedFont(StandardFonts.Helvetica);
  const characters = new Set(font.getCharacterSet());
  for (const recipient of evidence.acceptances) {
    for (const value of recipient.values) {
      const f = layout.fields.find(
        (field) => field.id === value.fieldId && field.roleId === recipient.roleId
      );
      if (!f) throw Error("Unassigned field in evidence");
      const page = pdf.getPage(f.pageIndex),
        rotation = ((page.getRotation().angle % 360) + 360) % 360;
      const box = toPdfRectangle(f.rect, page.getCropBox(), rotation);
      if (typeof value.value === "object") {
        const point = ([u, v]) => {
          if (rotation === 90) return { x: box.x + v * box.width, y: box.y + u * box.height };
          if (rotation === 180)
            return { x: box.x + (1 - u) * box.width, y: box.y + v * box.height };
          if (rotation === 270)
            return { x: box.x + (1 - v) * box.width, y: box.y + (1 - u) * box.height };
          return { x: box.x + u * box.width, y: box.y + (1 - v) * box.height };
        };
        for (const stroke of value.value.strokes)
          for (let i = 1; i < stroke.length; i++)
            page.drawLine({
              start: point(stroke[i - 1]),
              end: point(stroke[i]),
              thickness: Math.min(box.width, box.height) * 0.025,
            });
        continue;
      }
      const label = typeof value.value === "boolean" ? (value.value ? "X" : "") : value.value;
      if (!label) continue;
      if ([...label].some((c) => !characters.has(c.codePointAt(0))))
        throw Error("Configure a signing font covering all accepted characters");
      const width = rotation % 180 ? box.height : box.width,
        height = rotation % 180 ? box.width : box.height;
      const size = Math.min(
        16,
        height * 0.72,
        (width * 0.96) / Math.max(0.01, font.widthOfTextAtSize(label, 1))
      );
      if (size < 3) throw Error("Field too small for legible final appearance");
      const inset = height * 0.18;
      const x =
        box.x +
        (rotation === 90
          ? box.width - inset
          : rotation === 180
            ? box.width
            : rotation === 270
              ? inset
              : 0);
      const y =
        box.y +
        (rotation === 0
          ? inset
          : rotation === 180
            ? box.height - inset
            : rotation === 270
              ? box.height
              : 0);
      page.drawText(label, { font, size, x, y, rotate: degrees(rotation) });
    }
  }
  if (preview) return Buffer.from(await pdf.save());
  const acceptedAt = new Date(
    Math.max(...evidence.acceptances.map((a) => Date.parse(a.acceptedAt)))
  );
  await pdf.attach(Buffer.from(JSON.stringify(evidence)), "sign-evidence.json", {
    mimeType: "application/json",
    description: "Recipient acceptance evidence",
    creationDate: acceptedAt,
    modificationDate: acceptedAt,
  });
  pdflibAddPlaceholder({
    pdfDoc: pdf,
    reason: "Integrity of the collected document and acceptance evidence",
    name: "Corely Sign service",
    contactInfo: "",
    location: "",
    signingTime: acceptedAt,
    signatureLength: 16384,
  });
  return Buffer.from(await pdf.save({ useObjectStreams: false }));
}
process.once("message", async (job) => {
  try {
    const pdf = await render(job);
    process.send({ pdf }, () => process.disconnect());
  } catch {
    process.send(
      { error: "Could not render the accepted fields. Check font coverage and placement." },
      () => process.disconnect()
    );
  }
});
