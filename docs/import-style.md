# Import Style (TypeScript)

## Rule: Extensionless relative imports in TS/TSX

In TypeScript source files, **relative** imports/exports must omit `.js`:

✅ `import { X } from "./X";`
✅ `export { Y } from "../y";`
✅ `const mod = await import("./feature");`

❌ `import { X } from "./X.js";`
❌ `export * from "../y.js";`

## Scope

- Applies to `*.ts` and `*.tsx` only.
- **Relative paths only** (`./` or `../`).
- Package imports remain unchanged (e.g. `@corely/*`).
- Do not alter non-TS assets (`.json`, `.css`, `.svg`, etc.).

## Why

Node ESM requires file extensions at runtime. The repo standardizes on **bundled builds** (or other runtime-safe outputs) so TypeScript source stays extensionless and clean while runtime resolution remains correct.

## Enforcement

ESLint (`no-restricted-imports`) blocks `.js` relative specifiers in TS/TSX.
