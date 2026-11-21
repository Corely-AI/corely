import { createRequire } from "node:module";
import { Worker } from "node:worker_threads";

const resolveWorker = createRequire(import.meta.url);
let active = 0;
export async function inspectTemplatePdf(bytes: Buffer): Promise<number> {
  if (bytes.length > 10 * 1024 * 1024 || !bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    throw Error("Invalid or oversized PDF");
  }
  if (active >= 2) {
    throw Error("PDF inspection is busy. Try again.");
  }
  active++;
  try {
    const worker = new Worker(resolveWorker.resolve("#sign-pdf-inspector"), {
      workerData: bytes,
      env: {},
      execArgv: [],
      resourceLimits: { maxOldGenerationSizeMb: 128 },
    });
    try {
      return await new Promise<number>((resolve, reject) => {
        const fail = () =>
          reject(
            new Error("Use a static, unencrypted PDF without forms, signatures or active content.")
          );
        const timeout = setTimeout(fail, 6000);
        worker.once("message", (count: unknown) => {
          clearTimeout(timeout);
          if (typeof count === "number" && Number.isInteger(count) && count >= 1 && count <= 100) {
            resolve(count);
          } else {
            fail();
          }
        });
        worker.once("error", () => {
          clearTimeout(timeout);
          fail();
        });
        worker.once("exit", () => {
          clearTimeout(timeout);
          fail();
        });
      });
    } finally {
      await worker.terminate();
    }
  } finally {
    active--;
  }
}
