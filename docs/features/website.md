# Website Module (Admin + Public Resolve)

This document summarizes the Website module introduced on top of CMS.

## Overview

The Website module owns websites, domains, pages/routes, menus, publish/unpublish, and published snapshots. It integrates with CMS for content authoring and rendering without direct DB access across modules.

Website rendering follows a `Templates + Blocks` model:

- Templates are fixed React implementations owned and versioned by Corely.
- Blocks are validated JSON content edited in admin.
- Customers no longer edit arbitrary React code per site.

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

## Templates + Blocks Contracts

Shared contracts are defined in `packages/contracts/src/website/blocks/*` and exported from `@corely/contracts`.

- `WebsiteBlockBaseSchema`
- `WebsiteBlockUnionSchema` (discriminated by `type`)
- `WebsitePageContentSchema` with:
  - `templateKey`
  - `templateVersion?`
  - `blocks[]`
  - `seoOverride?`

Current template:

- `landing.deutschliebe.v1` with block types:
  `stickyNav`, `hero`, `socialProof`, `pas`, `method`, `programHighlights`, `groupLearning`,
  `coursePackages`, `schedule`, `instructor`, `testimonials`, `scholarship`, `faq`, `leadForm`, `footer`

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
