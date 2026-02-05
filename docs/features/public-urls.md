# Public URLs

This document defines the single public URL contract for Corely public experiences (website, rentals, portfolio, CMS) across local development and production.

## URL Contract

### Local development (single origin)

- Website (by websiteSlug): `http://localhost:8082/w/:workspaceSlug/:websiteSlug/(optional page path)`
- Rentals: `http://localhost:8082/w/:workspaceSlug/rentals/:rentalSlug`
- Portfolio: `http://localhost:8082/w/:workspaceSlug/portfolio/:portfolioSlug`
- CMS public entry: `http://localhost:8082/w/:workspaceSlug/cms/:cmsSlug`

### Production

Workspace host: `https://:workspaceSlug.my.corely.one`

- Rentals: `/rentals/:rentalSlug`
- Portfolio: `/portfolio/:portfolioSlug`
- CMS: `/cms/:cmsSlug`
- Website:
  - Default website: `/` (root) + optional page path
  - Non-default website: `/:websiteSlug/(optional page path)`

### Custom domains (planned)

- Custom domain serves the default website at root.
- Reserved module prefixes (`/rentals`, `/portfolio`, `/cms`) remain available under the custom domain when the host is mapped to a workspace.
- Code structure should allow host -> workspace/website resolution via a future public endpoint without rewriting routing.

## Workspace Resolution

- **Dev**: path-based, resolved from `/w/:workspaceSlug/...`
- **Prod**: host-based, resolved from `:workspaceSlug.my.corely.one`
- **Future**: custom domain resolution via a public resolver endpoint (stubbed where needed)

## Website Resolution

- **Dev**: websiteSlug is always the first segment after `/w/:workspaceSlug`.
- **Prod**:
  - If the first segment matches a known websiteSlug, treat as a non-default website.
  - Otherwise treat as the default website and use the full path as the page path.
  - Optional canonical redirect: `/:defaultWebsiteSlug/...` -> `/...`.

## Reserved Public Prefixes

Reserved prefixes (centralized):

```
["rentals","portfolio","cms","api","auth","w"]
```

Rules:

- `websiteSlug` must not equal any reserved prefix.
- `websiteSlug` must not start with a reserved prefix + `/` (to avoid ambiguous routes).
- `pagePath` for default websites in prod must not start with a reserved prefix.
- Website slug must match the kebab-case slug regex used elsewhere.

Enforced in:

- Shared helper: `@corely/public-urls`
- Backend validation (website site create/update)
- Admin UI validation
- Public-web routing guards

## Source of Truth

All public URLs must be generated via `@corely/public-urls` (`buildPublicUrl` + module wrappers). No module should hardcode public origins or path conventions.
