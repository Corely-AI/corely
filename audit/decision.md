# Decision: Extensionless TS Imports

## Chosen strategy

**Bundle Node-targeted packages that currently rely on ESM `.js` specifiers**, so runtime never sees internal relative specifiers.

## Rationale

- Node ESM runtime requires explicit file extensions; removing `.js` in TS source would otherwise break `node dist/*.js` execution.
- `services/api` already uses esbuild bundling in dev (`dev.mjs`) and has `build.mjs`/`esbuild.config.mjs` ready, so standardizing the **build** on bundling is the lowest-risk path.
- `@corely/email-templates` is already bundled via `tsdown` (ESM + CJS + dts), so removing `.js` specifiers in source is safe and consistent.
- Avoids switching to CommonJS and avoids `--experimental-specifier-resolution=node`.

## Notes

- `services/api` keeps `tsc --noEmit` for typechecking; bundling handles runtime output.
- No public API surface changes: package entrypoints remain unchanged.
