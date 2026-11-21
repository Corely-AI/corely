import { fork } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import type { SignValues, SignLayout } from "@corely/contracts";
import type { SignEvidence } from "../../application/ports/sign-artifact-engine";
const worker = createRequire(import.meta.url).resolve("#sign-renderer");
const scripts = dirname(worker),
  api = resolve(scripts, "../.."),
  modules = resolve(api, "../../node_modules");
let active = 0;
export async function renderInChild(
  source: Buffer,
  layout: SignLayout,
  evidence:
    | SignEvidence
    | { sourceSha256: string; acceptances: { roleId: string; values: SignValues }[] },
  fontBytes: Buffer | null,
  preview = false
): Promise<Buffer> {
  if (active >= 2) {
    throw Error("Document renderer is busy");
  }
  active++;
  try {
    return await new Promise<Buffer>((ok, fail) => {
      const child = fork(worker, [], {
        env: {},
        cwd: scripts,
        serialization: "advanced",
        stdio: ["ignore", "ignore", "ignore", "ipc"],
        execArgv: [
          "--permission",
          "--max-old-space-size=192",
          ...[scripts, resolve(api, "node_modules"), modules, resolve(api, "package.json")].map(
            (p) => "--allow-fs-read=" + p
          ),
        ],
      });
      const timeout = setTimeout(() => {
        fail(Error("Document renderer timed out"));
        child.kill();
      }, 20000);
      child.once("message", (msg: { pdf?: Buffer; error?: string }) => {
        if (Buffer.isBuffer(msg.pdf) && msg.pdf.length <= 32 * 1024 * 1024) {
          ok(msg.pdf);
        } else {
          fail(Error(msg.error ?? "Document rendering failed"));
        }
        child.kill();
      });
      child.once("error", (e) => {
        clearTimeout(timeout);
        fail(e);
        child.kill();
      });
      child.once("exit", () => {
        clearTimeout(timeout);
        fail(Error("Document renderer exited"));
      });
      child.send({ source, layout, evidence, fontBytes, preview });
    });
  } finally {
    active--;
  }
}
