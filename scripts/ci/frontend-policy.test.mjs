import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { forbiddenImports, frontendConsumers } from "./frontend-policy.mjs";
const root = process.cwd();
const file = path.join(root, "apps/invoice/src/app.tsx");
test("rejects static, dynamic and re-exported private app/backend imports", () => {
  for (const source of [
    "import x from '../../web/src/private';",
    "export * from '@corely/web/private';",
    "import('@corely/api/internal');",
    "require('../../../services/api/src/private');",
  ])
    assert.equal(forbiddenImports(source, file, root).length, 1, source);
});
test("accepts shared public features and app-local routes", () => {
  assert.deepEqual(
    forbiddenImports(
      "import x from '@corely/web-features/features/invoices'; import y from './routes';",
      file,
      root
    ),
    []
  );
});
test("app-only and shared changes both retain all existing and new Vite consumers", () => {
  const apps = frontendConsumers(root).map(({ app }) => app);
  for (const app of ["web", "freelancer", "crm", "openbuk-web", "app-center", "invoice", "login"])
    assert.ok(apps.includes(app), app);
});

test("focused Invoice rejects unrelated route entry points", () => {
  assert.equal(
    forbiddenImports("import { routes } from '@corely/web-features/features/people';", file, root)
      .length,
    1
  );
});

test("Invoice rejects aggregate feature exports that expose unrelated routes", () => {
  assert.equal(
    forbiddenImports("import { cashManagementFeature } from '@corely/web-features';", file, root)
      .length,
    1
  );
});
test("rejects backend dependencies in TypeScript import types and import-equals", () => {
  for (const source of [
    "type Api = import('@corely/api/internal').Api;",
    "import Api = require('@corely/api/internal');",
    "import(`@corely/api/internal`);",
  ])
    assert.equal(forbiddenImports(source, file, root).length, 1, source);
});
