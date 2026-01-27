# Results

## Packages changed

- `services/api`: build/dev:debug now use bundler output (`node build.mjs`, `node dev.mjs --inspect`); removed `.js` from relative imports.
- `packages/email-templates`: removed `.js` from relative imports.
- Repo ESLint configs: added enforcement to block `.js` in relative TS/TSX imports.
- Docs: added `docs/import-style.md` and index entry.

## Commands run

- `rg -n "from\s+['\"](\./|\.\./).*\.js['\"]|import\(\s*['\"](\./|\.\./).*\.js['\"]\s*\)" -g "*.ts" -g "*.tsx"`
- `git status -s`

## Commands not run (pending)

- `pnpm -r build`
- `pnpm -r lint`
- `pnpm -r typecheck`
- `pnpm -r test`
- service/app runtime smoke checks

## Notes / follow-ups

- If you want full verification, run the commands above and record results here.
