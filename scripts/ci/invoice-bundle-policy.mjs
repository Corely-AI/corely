import path from "node:path";

// Inspect rendered output, including modules reached through shared barrel exports.
export function unrelatedInvoiceModules(bundle) {
  const modules = new Set();
  for (const output of Object.values(bundle)) {
    if (output.type !== "chunk") continue;
    for (const [id, details] of Object.entries(output.modules)) {
      if (details.renderedLength === 0) continue;
      const file = id.replaceAll(path.sep, "/").split("?")[0];
      const feature = file.match(/\/packages\/web-features\/src\/features\/([^/]+)\.[jt]sx?$/);
      const screen = file.match(
        /\/packages\/web-features\/src\/modules\/([^/]+)\/(?:screens\/|routes(?:[/.]|$)|[^/]*(?:-page|Page)\.[jt]sx?$)/
      );
      const app = file.match(/\/apps\/([^/]+)\/src\//);
      if (
        (feature && feature[1] !== "invoices") ||
        (screen && screen[1] !== "invoices") ||
        (app && app[1] !== "invoice") ||
        /\/services\/[^/]+\/src\//.test(file)
      )
        modules.add(file);
    }
  }
  return [...modules].sort();
}
export function invoiceBundlePolicy() {
  return {
    name: "corely-invoice-bundle-boundaries",
    generateBundle(_options, bundle) {
      const violations = unrelatedInvoiceModules(bundle);
      if (violations.length) {
        this.error(`Invoice bundles unrelated routes or private code:\n${violations.join("\n")}`);
      }
    },
  };
}
