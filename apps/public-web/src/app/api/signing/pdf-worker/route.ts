import { readFile } from "node:fs/promises";
import { join } from "node:path";
export async function GET() {
  const worker = await readFile(
    join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.min.mjs")
  );
  return new Response(new Uint8Array(worker), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
