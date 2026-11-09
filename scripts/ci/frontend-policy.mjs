import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { fileURLToPath } from "node:url";

export function frontendConsumers(root) {
  return fs
    .readdirSync(path.join(root, "apps"))
    .sort()
    .flatMap((app) => {
      const dir = `apps/${app}`;
      const file = path.join(root, dir, "package.json");
      if (!fs.existsSync(file)) return [];
      const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
      // Conservative fan-out: every Vite consumer runs on every PR, including shared changes.
      return pkg.devDependencies?.vite || pkg.dependencies?.vite ? [{ app, dir }] : [];
    });
}
export function forbiddenImports(source, file, root) {
  const appPackages = fs.readdirSync(path.join(root, "apps")).flatMap((app) => {
    const manifest = path.join(root, "apps", app, "package.json");
    return fs.existsSync(manifest) ? [JSON.parse(fs.readFileSync(manifest, "utf8")).name] : [];
  });
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const violations = [];
  function visit(node) {
    let spec;
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    )
      spec = node.moduleSpecifier.text;
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        node.expression.getText(ast) === "require") &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    )
      spec = node.arguments[0].text;
    if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteralLike(node.argument.literal)
    )
      spec = node.argument.literal.text;
    if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression &&
      ts.isStringLiteralLike(node.moduleReference.expression)
    )
      spec = node.moduleReference.expression.text;
    if (spec) {
      const target = spec.startsWith(".")
        ? path
            .relative(root, path.resolve(path.dirname(file), spec))
            .split(path.sep)
            .join("/")
        : spec;
      const owner = path.relative(root, file).split(path.sep).slice(0, 2).join("/");
      const otherApp = target.startsWith("apps/") && !target.startsWith(`${owner}/`);
      const unrelatedRoutes =
        owner === "apps/invoice" &&
        (spec === "@corely/web-features" ||
          (/^@corely\/web-features\/features\//.test(spec) &&
            spec !== "@corely/web-features/features/invoices"));
      if (
        unrelatedRoutes ||
        otherApp ||
        appPackages.some((name) => target === name || target.startsWith(`${name}/`)) ||
        /^(services\/|@corely\/api(?:\/|$))/.test(target)
      )
        violations.push(spec);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return violations;
}
function scan(dir, root, errors) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) scan(file, root, errors);
    else if (/\.[cm]?[jt]sx?$/.test(file) && !/\.(spec|test)\./.test(file)) {
      for (const spec of forbiddenImports(fs.readFileSync(file, "utf8"), file, root))
        errors.push(`${path.relative(root, file)}: forbidden frontend import ${spec}`);
    }
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.cwd();
  const consumers = frontendConsumers(root);
  if (process.argv.includes("--matrix")) console.log(JSON.stringify({ include: consumers }));
  else {
    const errors = [];
    for (const { dir } of consumers) scan(path.join(root, dir, "src"), root, errors);
    for (const dir of ["web-shared", "web-features", "ui"])
      scan(path.join(root, "packages", dir, "src"), root, errors);
    if (errors.length) {
      console.error(errors.join("\n"));
      process.exitCode = 1;
    } else console.log("Frontend import boundaries passed.");
  }
}
