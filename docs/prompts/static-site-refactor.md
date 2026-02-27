You are a senior TypeScript refactoring agent.

Task
Refactor the CURRENT project to follow the same runtime-content architecture as this SAMPLE project:

SAMPLE_PROJECT=/Users/hadoan/Documents/GitHub/corely-studio-suite

Do this workflow first

1. Inspect SAMPLE_PROJECT and learn patterns from:
   - src/lib/env.default.ts
   - src/lib/corelyPublicApi.ts
   - src/content/useSiteCopy.ts
   - src/content/siteCopy.schema.ts (if present)
2. Reuse the same architecture style and naming conventions in CURRENT project.

Refactor goals for CURRENT project

- Vite + React app must be content-driven.
- No TSX content editing for business copy.
- Content must be JSON-serializable.
- Use Zod for schema validation.
- Fetch content from Corely public API at runtime.
- Support live (published) and preview (draft via previewToken).

Required implementation

1. Create/update `src/lib/env.default.ts`

- Add fallback env defaults at least:
  - VITE_CORELY_API_BASE_URL = "http://localhost:3000"
  - VITE_CORELY_SITE_ID = ""
  - VITE_CORELY_LOCALE_DEFAULT = "en-US"

2. Create content schema

- Add `src/content/siteCopy.schema.ts` with Zod schema.
- Export `SiteCopySchema` and `SiteCopy` type.

3. Create defaults

- Add `src/content/defaultSiteCopy.ts`.
- Export valid `defaultSiteCopy` matching schema.

4. Add API client

- Add `src/lib/corelyPublicApi.ts` with:
  - `getExternalContent({ siteId, key, locale, mode, previewToken })`
- Call:
  - `${VITE_CORELY_API_BASE_URL}/public/website/external-content`
- Query params:
  - siteId, key=siteCopy, optional locale, mode=live|preview, optional previewToken
- Validate envelope with Zod:
  - { key, locale?, version: "draft"|"published", updatedAt: string, data: unknown }
- Validate `data` using `SiteCopySchema`.
- Use `cache: "no-store"` for preview.

5. Add hook

- Add/update `src/content/useSiteCopy.ts`.
- Read env from `import.meta.env` + fallback `env.default.ts`.
- Read `previewToken` from URL query at runtime.
- If previewToken exists => mode=preview, else mode=live.
- Fetch from Corely API with React Query.
- Validate and deep-merge fetched data over `defaultSiteCopy`.
- On any error, return `defaultSiteCopy`.

6. Replace hardcoded copy

- Update UI components to read copy from `useSiteCopy()`.
- Keep layout/styles unchanged.

7. Optional static fallback

- If project has `/public/content/siteCopy.json`, keep as secondary fallback only.
- Fallback order:
  - API
  - static JSON
  - defaultSiteCopy

Quality checks

- Run build and typecheck.
- Fix all TS errors from refactor.
- Ensure no preview token is hardcoded.
- Ensure app still renders with no API.

Output required

- List changed files.
- Summarize key changes.
- Show build/typecheck results.
- Note assumptions or TODOs.
