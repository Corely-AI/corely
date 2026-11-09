import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { invoiceBundlePolicy } from "./invoice-bundle-policy.mjs";
const require = createRequire(path.resolve("apps/invoice/package.json"));
const { build } = await import(
  pathToFileURL(
    path.resolve(
      path.dirname(require.resolve("vite/package.json")),
      require("vite/package.json").exports["."].import.default
    )
  ).href
);
test("built Invoice rejects an unrelated route reached through a shared barrel", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "corely-invoice-bundle-"));
  try {
    const feature = path.join(root, "packages/web-features/src/features");
    fs.mkdirSync(feature, { recursive: true });
    fs.writeFileSync(
      path.join(root, "entry.js"),
      "import { routes } from './packages/web-features/src/index.js'; console.log(routes);"
    );
    fs.writeFileSync(
      path.join(root, "packages/web-features/src/index.js"),
      "export { routes } from './features/crm.js';"
    );
    fs.writeFileSync(path.join(feature, "crm.js"), "export const routes = ['/crm'];");
    const options = {
      root,
      configFile: false,
      logLevel: "silent",
      plugins: [invoiceBundlePolicy()],
      build: { write: false, rollupOptions: { input: path.join(root, "entry.js") } },
    };
    await assert.rejects(build(options), /Invoice bundles unrelated routes/);
    fs.writeFileSync(
      path.join(root, "entry.js"),
      "globalThis.loadRoutes = () => import('./packages/web-features/src/features/crm.js');"
    );
    await assert.rejects(build(options), /Invoice bundles unrelated routes/);
    fs.writeFileSync(
      path.join(root, "entry.js"),
      "import { routes } from './packages/web-features/src/index.js'; console.log(routes);"
    );
    fs.renameSync(path.join(feature, "crm.js"), path.join(feature, "invoices.js"));
    fs.writeFileSync(
      path.join(root, "packages/web-features/src/index.js"),
      "export { routes } from './features/invoices.js';"
    );
    await build(options);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
