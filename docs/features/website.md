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

## AI Page Generation (v1)

`POST /website/ai/generate-page`:

- Accepts prompt + site/locale/pageType (+ optional brand voice/path).
- Uses the shared AI client/adapter and strict Zod validation for a JSON blueprint.
- Creates a CMS draft entry from the blueprint (via `CmsWritePort`).
- Creates a Website page in `DRAFT` referencing `cmsEntryId`.
