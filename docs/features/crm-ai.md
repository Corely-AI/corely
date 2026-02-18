# CRM AI (Deals & Activities)

This document describes the CRM AI implementation for Deals and Activities, including rollout controls, data handling, and extension points.

## Scope implemented

- Deals object page:
  - AI Insights card (`/crm/deals/:id/ai/insights`)
  - Next Best Actions card (`/crm/deals/:id/ai/recommendations`)
  - Health badge (deterministic analytics included in insights response)
  - AI message draft dialog (`/crm/deals/:id/ai/draft-message`)
  - Communication summarize + follow-up task proposals (`/crm/comms/ai/summarize`)
- New Activity page:
  - `Describe it` parse flow (`/crm/activities/ai/parse`)
  - Notes summarize/extract/follow-up proposals (`/crm/activities/ai/extract`)
  - Smart linking suggestions for deals/contacts with explicit user action
  - Non-blocking quality nudges and subject generation helper
- Settings:
  - Workspace AI settings read/update (`GET/PATCH /crm/ai/settings`)

## Feature flags

Environment flags (`packages/config/src/env/env.schema.ts`):

- `CRM_AI_ENABLED`
- `CRM_AI_V2_ANALYTICS_ENABLED`
- `CRM_AI_INTENT_SENTIMENT_ENABLED`

Behavior:

- `CRM_AI_ENABLED=false` disables CRM AI generation endpoints and hides/disables AI UI features.
- `CRM_AI_V2_ANALYTICS_ENABLED` gates advanced deterministic analytics outputs for CRM AI.
- `CRM_AI_INTENT_SENTIMENT_ENABLED` gates inbound intent/sentiment classification.

Workspace settings (persisted per tenant/workspace):

- `aiEnabled`
- `intentSentimentEnabled`

Storage key:

- `ext.kv` scope `workspace:{workspaceId}`, module `crm`, key `ai-settings-v1`

## Data storage and caching

- Deal AI snapshots are stored in `crm.DealAiSnapshot`:
  - `tenantId`, `workspaceId`, `dealId`, `kind`, `generatedAt`, `payloadJson`, `version`, `ttlExpiresAt`
- Snapshot repository:
  - `services/api/src/modules/crm/infrastructure/prisma/prisma-crm-ai-snapshot-repo.adapter.ts`
- Current TTL:
  - `CRM_AI_INSIGHTS_TTL_MS = 30 minutes` in `services/api/src/modules/crm/application/use-cases/ai/crm-ai.shared.ts`

## Privacy and security

- AI endpoints are protected by Auth + RBAC permissions (`crm.deals.read/manage`, `crm.activities.manage`).
- AI outputs are validated against `@corely/contracts` Zod schemas before returning to clients.
- No chain-of-thought or raw reasoning is persisted.
- Cached artifacts store structured output payloads only (not raw prompt transcripts).
- Intent/sentiment runs only for inbound messages and only when both env and workspace settings enable it.

## Confirmed action model (tool-card pattern)

- AI recommendations/proposals return structured tool-card payloads in contracts.
- UI requires explicit user confirmation before applying tool-card actions.
- No silent mutations are executed from AI output.
- Mutation actions from AI proposals pass idempotency keys where available.

## Prompts and extensibility

Prompt templates are in `packages/prompts/src/prompts/crm.ts`:

- `crm.ai.deal_insights`
- `crm.ai.deal_message_draft`
- `crm.ai.activity_parse`
- `crm.ai.activity_extract`
- `crm.ai.communication_summarize`
- `crm.ai.intent_sentiment`

Guidelines:

- Keep prompts schema-driven and JSON-only.
- Prefer `unknown`/`null` when evidence is missing.
- Respect workspace language (`en`, `de`, `vi` normalization path in shared helper).

## Contracts and APIs

Contracts:

- `packages/contracts/src/crm/ai-crm.schema.ts`

HTTP controller:

- `services/api/src/modules/crm/adapters/http/crm-ai.controller.ts`

Frontend integration:

- Deals screen: `apps/web/src/modules/crm/screens/DealDetailPage.tsx`
- Activity create screen: `apps/web/src/modules/crm/screens/NewActivityPage.tsx`
