import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { invoiceBundlePolicy } from "./invoice-bundle-policy.mjs";

const root = process.cwd();
const require = createRequire(path.join(root, "apps/invoice/package.json"));
const { build } = await import(
  pathToFileURL(
    path.resolve(
      path.dirname(require.resolve("vite/package.json")),
      require("vite/package.json").exports["."].import.default
    )
  ).href
);
const result = await build({
  configFile: path.join(root, "apps/invoice/vite.config.ts"),
  plugins: [invoiceBundlePolicy()],
  build: { write: false },
});
const modules = new Set();
for (const output of Array.isArray(result) ? result : [result]) {
  for (const chunk of output.output) {
    if (chunk.type === "chunk") {
      for (const [id, details] of Object.entries(chunk.modules)) {
        if (details.renderedLength > 0) modules.add(path.relative(root, id));
      }
    }
  }
}
fs.mkdirSync("ci-results", { recursive: true });
fs.writeFileSync(
  "ci-results/invoice-bundle-modules.json",
  JSON.stringify([...modules].sort(), null, 2)
);
console.log(`Invoice bundle boundaries passed (${modules.size} rendered modules).`);
