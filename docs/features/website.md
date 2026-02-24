# Website Module (Admin + Public Resolve)

This document summarizes the Website module introduced on top of CMS.

## Overview

The Website module owns websites, domains, pages/routes, menus, publish/unpublish, and published snapshots. It integrates with CMS for content authoring and rendering without direct DB access across modules.

Website rendering follows a `Templates + Blocks` model:

- Templates are fixed React implementations owned and versioned by Corely.
- Blocks are validated JSON content edited in admin.
- Customers no longer edit arbitrary React code per site.

Website page creation now also supports `Presets`:

- Presets are starter `WebsitePageContent` payloads for `/website/sites/:siteId/pages/new`.
- Presets can be built-in (shipped by code) or site-specific (saved from admin UI).
- Presets reduce template sprawl: most new page structures should be presets, not new template keys.

## Responsibility Split

Website module (this module):

- `WebsiteSite`, `WebsiteDomain`, `WebsitePage`, `WebsiteMenu`, `WebsitePageSnapshot`
- Page routing, SEO metadata, publish/unpublish state
- Public resolve endpoint (`/public/website/resolve`)
- AI-assisted page generation (draft + CMS content blueprint)
- Page content draft editing endpoints (`/website/pages/:pageId/content`)

CMS module:

- Content entries, blocks/blueprints, rendering payloads
- Draft/publish lifecycle for content entries
- Public content rendering for CMS-owned content types

## Module Composition (Current Code)

NestJS module:

- Module file: `services/api/src/modules/website/website.module.ts`
- Imports: `DataModule`, `KernelModule`, `IdentityModule`, `DocumentsModule`, `PromptModule`, `CmsModule`, `CustomizationModule`
- Controllers:
  - `website-sites.controller.ts`
  - `website-domains.controller.ts`
  - `website-pages.controller.ts`
  - `website-menus.controller.ts`
  - `website-qa.controller.ts`
  - `website-wall-of-love.controller.ts`
  - `website-public.controller.ts`
  - `website-ai.controller.ts`

Application layer:

- `WebsiteApplication` composes all Website use cases behind one injection point.
- Current use-case count: 39 files under `application/use-cases`.
- Domain logic is isolated in `domain/*` (slug/locale/path validators, page-content normalization, site-settings normalization, preview-token checks, wall-of-love URL validation).

Infrastructure/adapter layer:

- Prisma repositories for Website-owned entities.
- CMS integration via ports/adapters (`CmsReadPort`, `CmsWritePort`) and `CmsWebsitePortAdapter`.
- Document/public file URL integration via `WebsitePublicFileUrlPort`.
- Custom settings integration via customization adapter (`WebsiteCustomAttributesPort`).
- AI generation adapter via `AiSdkWebsitePageGenerator`.

## Data Model (Current Prisma)

Website module owns tables in Prisma schema `content`:

- `WebsiteSite`
- `WebsiteDomain`
- `WebsitePage`
- `WebsiteMenu`
- `WebsitePageSnapshot`
- `WebsiteFeedback`
- `WebsiteFeedbackImage`
- `WebsiteQa`
- `WebsiteWallOfLoveItem`
- `WebsiteWallOfLoveItemImage`

Key constraints:

- Site slug uniqueness: `@@unique([tenantId, slug])`
- Page uniqueness: `@@unique([tenantId, siteId, path, locale])`
- Menu uniqueness: `@@unique([tenantId, siteId, name, locale])`
- Snapshot version uniqueness: `@@unique([tenantId, pageId, version])`

## Templates + Blocks Contracts

Shared contracts are defined in `packages/contracts/src/website/blocks/*` and exported from `@corely/contracts`.

- `WebsiteBlockBaseSchema`
- `WebsiteBlockUnionSchema` (discriminated by `type`)
- `WebsitePageContentSchema` with:
  - `templateKey`
  - `templateVersion?`
  - `blocks[]`
  - `seoOverride?`

Current templates:

- `landing.tutoring.v1` with block types:
  `stickyNav`, `hero`, `socialProof`, `pas`, `method`, `programHighlights`, `groupLearning`,
  `coursePackages`, `schedule`, `instructor`, `testimonials`, `scholarship`, `faq`, `leadForm`, `footer`
- `landing.nailstudio.v1` with block types:
  `stickyNav`, `hero`, `servicesGrid`, `priceMenu`, `galleryMasonry`, `signatureSets`, `team`,
  `testimonials`, `bookingSteps`, `locationHours`, `faq`, `leadForm`, `footer`
- Legacy alias:
  `landing.deutschliebe.v1` -> routed to tutoring runtime template

## Site Settings Contract

Website public resolve now includes `site.settings` as a typed contract:

- `settings.common`: branding + SEO defaults + header/footer/socials
- `settings.theme`: theme token settings
- `settings.custom`: arbitrary JSON key/value properties

Persistence boundaries:

- `common` and `theme` are stored in `WebsiteSite.brandingJson` / `WebsiteSite.themeJson`
- `custom` is stored in Customization custom attributes (`ext.entity_attr`) with:
  - `entityType = \"WebsiteSite\"`
  - `entityId = siteId`
  - module-scoped storage via the customization service adapter

Website does not write customization tables directly from its Prisma repositories.

Website settings updates call the Customization adapter port (`WebsiteCustomAttributesPort`) for `settings.custom`.

Preset persistence (site-specific presets):

- Site custom page presets are stored in `settings.custom` using key:
  - `website.pagePresets`
- This is persisted via Website Site update flow (`PUT/PATCH /website/sites/:siteId`) and Customization adapter.
- No direct custom-attribute DB access from web app.

## How To Add New Website Structure

### Path A: No-code (recommended for most new structures)

Use this when existing block types are enough.

1. Open or create a page and arrange blocks to match the target structure.
2. Edit copy/props until the structure is reusable.
3. In page editor `Page blocks`, click `Save as preset`.
4. Provide:
   - preset name
   - preset key (format: `a-z`, `0-9`, `.`, `_`, `-`, must start with a letter)
   - optional description
5. Create a new page at `/website/sites/:siteId/pages/new`.
6. Choose the saved preset from `Preset` dropdown.
7. The editor auto-fills:
   - `templateKey`
   - default blocks/content
   - default locale
   - suggested path base
8. Save page and continue editing/publishing as usual.

Scope:

- Site-specific presets are visible for that site (stored in site custom settings).
- This is the fastest way to launch a new page structure without deployments.

### Path B: Code change required

Use this only when no-code preset composition is insufficient.

1. New structure using existing blocks, but needed globally:
   - Add a built-in preset definition in web editor preset registry.
2. New block capability needed:
   - Add block schema/type in `packages/contracts` (`WebsiteBlockUnionSchema`).
   - Add runtime renderer in `apps/website-runtime`.
   - Add admin editor fields/defaults in `apps/web`.
3. New layout/runtime behavior needed (rare):
   - Add/extend template in runtime `TemplateRegistry`.
   - Keep template count low; prefer presets whenever possible.

## Integration Boundaries

- No direct reads/writes of CMS tables from Website.
- Website uses explicit ports:
  - `CmsReadPort.getEntryForWebsiteRender(...)`
  - `CmsReadPort.getEntryContentJson(...)`
  - `CmsWritePort.createDraftEntryFromBlueprint(...)`
  - `CmsWritePort.updateDraftEntryContentJson(...)`
- Website publish/unpublish writes outbox events:
  - `website.page.published`
  - `website.page.unpublished`

## Publish + Snapshot Strategy

- Publish generates a `WebsitePageSnapshot` with:
  - `template`
  - `seo`
  - `content` (resolved page blocks JSON)
  - `settings` (common/theme/custom)
  - `menus` (resolved public menu payload)
- Snapshot + page status update + outbox event are done in a single transaction.
- Live resolve always serves the latest snapshot; preview resolve reads CMS render payload directly.

## Admin Page Content Endpoints

- `GET /website/pages/:pageId/content`
- `PATCH /website/pages/:pageId/content`

Draft blocks are stored in CMS draft content (`contentJson`) for `WebsitePage.cmsEntryId`.

## Public Resolve

`GET /public/website/resolve?host=&path=&locale=&mode=live|preview`

- Resolves domain → site → page (with normalized host/path/locale).
- `mode=preview` requires a valid preview token and returns draft content for linked `cmsEntryId`.
- `mode=live` returns the latest snapshot payload.
- Response includes:
  - `site.settings` (`common`, `theme`, `custom`)
  - `page.content` (`WebsitePageContent`)
  - legacy compatibility fields (`template`, `payloadJson`, etc.)

Resolution order and behavior:

- Normalize host/path/locale first.
- Try `WebsiteDomain` hostname mapping (custom domain).
- If no custom domain match:
  - resolve workspace context from host/path
  - if first path segment is a non-reserved slug and matches a site slug, use that site and strip the segment from page path
  - otherwise use workspace default site
- Resolve page by `(tenantId, siteId, path, locale)`.
- Locale fallback is normalized locale input or site default locale.

## Public Site Settings

`GET /public/website/settings?siteId=<siteId>`

- Returns typed website settings only:
  - `settings.common` + `settings.theme` from `WebsiteSite` JSON
  - `settings.custom` from customization custom attributes
- Intended for public custom React/Next clients that need branding + custom settings without resolving a page payload.

## Public Feedback

`POST /public/website/feedback`

- Resolves website context by `siteRef.hostname + siteRef.path + siteRef.locale` (custom domains supported).
- Supports message + optional `imageFileIds` + optional `youtubeUrls`.
- YouTube URLs are normalized and persisted as `[{ provider: \"youtube\", videoId, url }]`.

Example request:

```json
{
  "siteRef": {
    "hostname": "www.example.com",
    "path": "/pricing",
    "locale": "en-US",
    "mode": "live"
  },
  "message": "Love the product, please add feature X",
  "email": "user@example.com",
  "name": "User",
  "rating": 5,
  "imageFileIds": ["file_123"],
  "youtubeUrls": ["https://youtu.be/dQw4w9WgXcQ"],
  "meta": {
    "userAgent": "Mozilla/5.0",
    "referrer": "https://www.example.com/pricing",
    "consent": true
  }
}
```

Example response:

```json
{
  "feedbackId": "fb_123"
}
```

## Public Q&A

`GET /public/website/qa?siteId=&locale=&scope=site|page&pageId=`

- Returns only `published` records.
- `scope=site` lists site-level FAQ items.
- `scope=page` lists page-level FAQ items (`pageId` required for siteId mode; returns empty when missing/not found).
- Locale fallback: requested locale first, then site default locale.
- Backward compatibility: `hostname + path` query is still supported.

Example response:

```json
{
  "items": [
    {
      "id": "qa_123",
      "question": "Do you offer refunds?",
      "answerHtml": "<p>Yes, within 30 days.</p>",
      "order": 1,
      "updatedAt": "2026-02-18T08:00:00.000Z"
    }
  ]
}
```

## Wall Of Love (Testimonials)

Admin screen:

- Website Sites list now includes a `Wall Of Love` action.
- Main admin route: `/website/sites/:siteId/wall-of-love`

Admin API:

- `GET /website/sites/:siteId/wall-of-love/items`
- `POST /website/sites/:siteId/wall-of-love/items`
- `PATCH /website/wall-of-love/items/:itemId`
- `POST /website/wall-of-love/items/:itemId/publish`
- `POST /website/wall-of-love/items/:itemId/unpublish`
- `POST /website/sites/:siteId/wall-of-love/items/reorder`

Public API:

- `GET /public/website/wall-of-love?siteId=<siteId>`
- Returns only published items, ordered by `order`.

Example public response:

```json
{
  "items": [
    {
      "id": "wol_123",
      "type": "image",
      "imageFileIds": ["file_abc"],
      "quote": "Corely helped us ship 2x faster.",
      "authorName": "Jane Doe",
      "authorTitle": "CEO, Example Inc.",
      "sourceLabel": "Customer Story",
      "order": 0
    },
    {
      "id": "wol_124",
      "type": "youtube",
      "linkUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "imageFileIds": [],
      "order": 1
    }
  ]
}
```

Validation:

- `type=youtube`: URL must be a valid YouTube URL and is normalized to canonical watch format.
- `type=x`: URL must be from `x.com` (or `twitter.com`) and is normalized to `https://x.com/...`.
- `type=image`: publishing requires at least one `imageFileId`.

## Public Forms Submission

- Public website can submit directly to existing Forms endpoint:
  - `POST /public/forms/:publicId/submissions`
- `apps/public-web` now includes `publicApi.submitPublicForm(publicId, payload)`.

## API Inventory (Current)

Admin endpoints (auth required):

- Sites
  - `GET /website/sites`
  - `POST /website/sites`
  - `GET /website/sites/:siteId`
  - `PUT /website/sites/:siteId`
  - `PATCH /website/sites/:siteId`
- Domains
  - `GET /website/sites/:siteId/domains`
  - `POST /website/sites/:siteId/domains`
  - `DELETE /website/sites/:siteId/domains/:domainId`
- Pages
  - `GET /website/sites/:siteId/pages`
  - `POST /website/sites/:siteId/pages`
  - `GET /website/pages/:pageId`
  - `PUT /website/pages/:pageId`
  - `GET /website/pages/:pageId/content`
  - `PATCH /website/pages/:pageId/content`
  - `POST /website/pages/:pageId/publish`
  - `POST /website/pages/:pageId/unpublish`
- Menus
  - `GET /website/sites/:siteId/menus`
  - `PUT /website/sites/:siteId/menus`
- QA
  - `GET /website/sites/:siteId/qa`
  - `POST /website/sites/:siteId/qa`
  - `PUT /website/sites/:siteId/qa/:qaId`
  - `DELETE /website/sites/:siteId/qa/:qaId`
- Wall of Love
  - `GET /website/sites/:siteId/wall-of-love/items`
  - `POST /website/sites/:siteId/wall-of-love/items`
  - `PATCH /website/wall-of-love/items/:itemId`
  - `POST /website/wall-of-love/items/:itemId/publish`
  - `POST /website/wall-of-love/items/:itemId/unpublish`
  - `POST /website/sites/:siteId/wall-of-love/items/reorder`
- AI
  - `POST /website/ai/generate-page`
  - `POST /website/ai/generate-blocks`
  - `POST /website/ai/regenerate-block`

Public endpoints (no auth):

- `GET /public/website/resolve`
- `GET /public/website/settings`
- `POST /public/website/feedback`
- `GET /public/website/qa`
- `GET /public/website/wall-of-love`
- `GET /public/website/slug-exists`

Caching notes (public endpoints):

- Resolve/settings/qa/wall-of-love use `Cache-Control` headers with short public caching + stale-while-revalidate.
- Slug-exists uses a longer cache window than resolve.

## Security Notes

- Public resolve preview mode requires a non-empty, validated preview token.
- Preview submissions require `siteRef.mode=\"preview\"` with a non-empty, validated token shape.
- Public feedback endpoint includes a basic per-IP, per-host rate limit.
- All public website endpoints resolve by host/path via existing workspace + domain resolution logic, including custom domains.

## AI Page Generation (v1)

`POST /website/ai/generate-page`:

- Accepts prompt + site/locale/pageType (+ optional brand voice/path).
- Uses the shared AI client/adapter and strict Zod validation for a JSON blueprint.
- Creates a CMS draft entry from the blueprint (via `CmsWritePort`).
- Creates a Website page in `DRAFT` referencing `cmsEntryId`.

Additional AI block endpoints:

- `POST /website/ai/generate-blocks`
  - Generates validated `blocks[]` for a template.
- `POST /website/ai/regenerate-block`
  - Regenerates one block (`blockType`) with schema validation.

## Website Runtime App (`apps/website-runtime`)

Purpose:

- Next.js runtime for public Website pages.
- Uses public Website API endpoints and shared contracts from `@corely/contracts`.
- Default dev port: `8084`.

Route structure:

- `/__website/[[...slug]]`
  - Internal rewritten route for host-based website rendering.
- `/w/[workspaceSlug]`
  - Workspace root website entry route.
- `/w/[workspaceSlug]/[websiteSlug]/[[...slug]]`
  - Explicit website slug route (default/non-default website handling).

Middleware behavior:

- Detect workspace host from `NEXT_PUBLIC_ROOT_DOMAIN`.
- Rewrite host-style requests to `/w/<workspaceSlug>...`.
- Redirect away redundant `/w/<workspaceSlug>` prefix on workspace host.
- Rewrite non-internal public paths to `/__website` namespace (excluding reserved/static prefixes).

Rendering pipeline:

- Server component resolves request context (`host`, `protocol`, `accept-language`).
- Calls `publicApi.resolveWebsitePage(...)`.
- Resolves metadata (`title`, `description`, OG image) from:
  - `page.content.seoOverride`
  - snapshot/page SEO fields
  - CMS payload fallback
  - site settings fallback
- Renders `WebsitePublicPageScreen`:
  - uses typed `page.content` if available
  - falls back to legacy `payloadJson` shape for compatibility
  - renders via `TemplateRegistry` + `BlockRegistry`
  - wraps with `PublicSiteLayout` (theme tokens + preview badge)

Template/block runtime model:

- Template key in production use: `landing.tutoring.v1`
- Legacy alias supported: `landing.deutschliebe.v1`
- Block rendering is schema-validated; invalid blocks render placeholder in preview mode, and are skipped in live mode.

Runtime API client source:

- `apps/website-runtime/src/lib/public-api.ts` re-exports `@corely/public-api-client`.
- API base URL fallback order:
  - `CORELY_API_BASE_URL`
  - `PUBLIC_API_BASE_URL`
  - `NEXT_PUBLIC_API_BASE_URL`
  - `http://localhost:3000`

Required environment for local runtime:

- `VITE_WEBSITE_RUNTIME_BASE_URL=http://localhost:8084` (used by admin links)
- `CORELY_API_BASE_URL` or `PUBLIC_API_BASE_URL` or `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_ROOT_DOMAIN` for host/workspace resolution

## End-to-End Flow (Live Request)

1. Browser requests a public page URL.
2. Runtime middleware normalizes/re-writes request path.
3. Runtime page route calls `publicApi.resolveWebsitePage(host, path, locale, mode=live)`.
4. API resolves site/page by domain/workspace rules.
5. API loads latest page snapshot and returns typed payload (`settings`, `menus`, `page.content`, `seo`).
6. Runtime renders template blocks and site theme.

Preview flow differences:

- Runtime enables no-store for preview requests.
- API validates preview token and reads CMS preview render payload directly (instead of snapshots).

## Known Gaps / Notes

- Website runtime Lead Form component currently contains a placeholder submit handler (UI success state only); it is not yet wired to Website feedback/forms submission endpoint in this runtime app.
