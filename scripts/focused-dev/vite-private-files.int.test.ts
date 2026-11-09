import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type ViteDevServer } from "vite";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { resolve, sep } from "node:path";
import { parseFocusedDevEnv } from "../../packages/config/src/focused-surfaces";
import { validEnv } from "./test-fixture";
import { focusedViteOptions } from "./vite-options";

const temporaryRoot = resolve("tmp");
mkdirSync(temporaryRoot, { recursive: true });
const directory = mkdtempSync(resolve(temporaryRoot, "391-private[fixture]-"));
const settings = resolve(directory, "settings.local");
const key = resolve(directory, "key-without-extension");
const certificate = resolve(directory, "certificate-without-extension");
for (const file of [settings, key, certificate]) {
  writeFileSync(file, "synthetic-private-marker");
}
let server: ViteDevServer;
let origin: string;
beforeAll(async () => {
  const config = parseFocusedDevEnv(validEnv);
  const options = focusedViteOptions(config, [settings, key, certificate]);
  server = await createServer({
    ...options,
    configFile: false,
    root: resolve("apps/login"),
    server: { ...options.server, host: "127.0.0.1", port: 0, hmr: false },
  });
  await server.listen();
  origin = server.resolvedUrls?.local[0] ?? "";
});
afterAll(async () => {
  await server?.close();
  if (!resolve(directory).startsWith(`${temporaryRoot}${sep}`)) {
    throw new Error("Refusing cleanup outside the test temporary directory");
  }
  rmSync(directory, { recursive: true, force: true });
});
describe("private files behind the focused Vite server", () => {
  it("continues serving the public login entry", async () => {
    const response = await fetch(new URL("/index.html", origin));
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Sign in to Corely");
  });
  it.each(
    [settings, key, certificate].flatMap((file) =>
      ["", "?raw", "?url"].map((query) => [file, query])
    )
  )("blocks private file %s%s", async (file, query) => {
    const response = await fetch(new URL(`/@fs/${file.replaceAll("\\", "/")}${query}`, origin));
    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain("synthetic-private-marker");
  });
});
