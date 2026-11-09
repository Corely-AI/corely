// @vitest-environment node
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("builds styled App Center assets when invoked from the repository root", () => {
  const app = fileURLToPath(new URL("../", import.meta.url));
  const repo = resolve(app, "../..");
  const vite = join(
    dirname(createRequire(import.meta.url).resolve("vite/package.json")),
    "bin/vite.js"
  );
  const output = mkdtempSync(join(tmpdir(), "corely-app-center-build-"));
  try {
    // The focused-dev wrapper sets Vite's root but keeps the repository working directory.
    execFileSync(
      process.execPath,
      [
        vite,
        "build",
        app,
        "--config",
        join(app, "vite.config.ts"),
        "--outDir",
        output,
        "--emptyOutDir",
      ],
      { cwd: repo, stdio: "pipe" }
    );
    const assets = join(output, "assets");
    const css = readdirSync(assets)
      .filter((file) => file.endsWith(".css"))
      .map((file) => readFileSync(join(assets, file), "utf8"))
      .join("\n");
    expect(css).toContain(".text-3xl{");
    expect(css).toContain(".sm\\:px-8{");
    expect(css).toContain(".bg-primary{");
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
}, 30_000);
