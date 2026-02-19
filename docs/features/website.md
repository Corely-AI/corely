# Website Module (Admin + Public Resolve)

This document summarizes the Website module introduced on top of CMS.

## Overview

The Website module owns websites, domains, pages/routes, menus, publish/unpublish, and published snapshots. It integrates with CMS for content authoring and rendering without direct DB access across modules.

## Responsibility Split

Website module (this module):

- `WebsiteSite`, `WebsiteDomain`, `WebsitePage`, `WebsiteMenu`, `WebsitePageSnapshot`
- Page routing, SEO metadata, publish/unpublish state
- Public resolve endpoint (`/public/website/resolve`)
- AI-assisted page generation (draft + CMS content blueprint)

CMS module:

- Content entries, blocks/blueprints, rendering payloads
- Draft/publish lifecycle for content entries
- Public content rendering for CMS-owned content types

## Integration Boundaries

- No direct reads/writes of CMS tables from Website.
- Website uses explicit ports:
  - `CmsReadPort.getEntryForWebsiteRender(...)`
  - `CmsWritePort.createDraftEntryFromBlueprint(...)`
- Website publish/unpublish writes outbox events:
  - `website.page.published`
  - `website.page.unpublished`

## Publish + Snapshot Strategy

- Publish generates a `WebsitePageSnapshot` with:
  - `template`
  - `seo`
  - `content` (CMS render payload at publish time)
- Snapshot + page status update + outbox event are done in a single transaction.
- Live resolve always serves the latest snapshot; preview resolve reads CMS render payload directly.

## Public Resolve

`GET /public/website/resolve?host=&path=&locale=&mode=live|preview`

- Resolves domain → site → page (with normalized host/path/locale).
- `mode=preview` returns CMS render payload for the linked `cmsEntryId`.
- `mode=live` returns the latest snapshot payload.

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

`GET /public/website/qa?hostname=&path=&locale=&scope=site|page`

- Returns only `published` records.
- `scope=site` lists site-level FAQ items.
- `scope=page` lists page-level FAQ items; returns an empty array when the page does not resolve.
- Locale fallback: requested locale first, then site default locale.

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

- Preview submissions require `siteRef.mode=\"preview\"` with a non-empty, validated token shape.
- Public feedback endpoint includes a basic per-IP, per-host rate limit.
- All public website endpoints resolve by host/path via existing workspace + domain resolution logic, including custom domains.

## AI Page Generation (v1)

`POST /website/ai/generate-page`:

- Accepts prompt + site/locale/pageType (+ optional brand voice/path).
- Uses the shared AI client/adapter and strict Zod validation for a JSON blueprint.
- Creates a CMS draft entry from the blueprint (via `CmsWritePort`).
- Creates a Website page in `DRAFT` referencing `cmsEntryId`.
