import { readFile } from "node:fs/promises";
import { join } from "node:path";
export async function GET() {
  const code = await readFile(
    join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.mjs")
  );
  return new Response(new Uint8Array(code), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
