const escapePdfText = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, "?");

export const buildSimplePdf = (lines: string[]): Buffer => {
  const pageHeight = 792;
  const commands = lines
    .slice(0, 40)
    .map(
      (line, index) => `1 0 0 1 48 ${pageHeight - 56 - index * 16} Tm (${escapePdfText(line)}) Tj`
    )
    .join("\n");

  const content = `BT
/F1 12 Tf
14 TL
${commands}
ET`;

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >> endobj",
    `4 0 obj << /Length ${Buffer.byteLength(content, "utf8")} >> stream
${content}
endstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${object}\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref
0 ${objects.length + 1}
0000000000 65535 f 
`;

  for (const offset of offsets) {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n 
`;
  }

  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>
startxref
${xrefOffset}
%%EOF`;

  return Buffer.from(pdf, "utf8");
};
