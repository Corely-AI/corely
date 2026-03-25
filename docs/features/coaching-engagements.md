# Coaching Engagements

## Scope

`coaching-engagements` adds a vertical pack for coaching services without breaking module boundaries. The pack owns coaching-specific workflow state and orchestration while reusing:

- `party` for client lookup and coach/client relationships
- `documents` for document storage, linking, and retrieval
- `invoices` plus Stripe billing adapters for invoice issuance and payment capture
- background outbox handlers for retry-safe side effects
- `ai-copilot` tool registration for authorized artifact summarization
- web shared CRUD and i18n packages for list/detail UI and localized user-facing strings

## Persistence

Following the 3-tier persistence strategy, coaching is a mid-sized module and stores its core records in the existing `crm` schema bucket:

- `crm.CoachingOffer`
- `crm.CoachingEngagement`
- `crm.CoachingSession`
- `crm.CoachingEngagementEvent`
- `crm.CoachingArtifactBundle`

Artifacts themselves remain in the shared Documents module and are linked back to coaching via `platform.DocumentLink`.

## Lifecycle

The pack models the booking lifecycle as domain events persisted through the outbox:

- `coaching.booking.requested`
- `coaching.invoice.issued`
- `coaching.payment.captured`
- `coaching.contract.signed`
- `coaching.prep_form.requested`
- `coaching.prep_form.submitted`
- `coaching.meeting_link.issued`
- `coaching.session.completed`
- `coaching.debrief.requested`
- `coaching.debrief.submitted`
- `coaching.export_bundle.requested`

Business gating is enforced in application and domain logic, not only in UI:

- payment-required offers stay blocked until payment is captured
- contract-required offers stay blocked until the contract is signed
- prep-required offers do not issue the meeting link until the prep form is submitted

## Boundaries

- Controllers call coaching use cases only.
- Only coaching repositories touch coaching Prisma models.
- Cross-module work happens through existing applications and ports:
  - `CustomerQueryPort`
  - `DocumentsApplication`
  - `InvoicesApplication`
  - outbox events consumed by the background runtime
- Coaching never writes invoice or document tables directly.

## Security And Authorization

- All coaching writes require tenant and workspace context.
- Important mutations write audit entries.
- Public contract/prep/debrief endpoints use hashed access tokens and resolve only the scoped engagement or session.
- AI summaries read only the documents already linked to the engagement and therefore inherit document authorization and provenance.

## UI And Localization

The web pack adds:

- engagement list
- session list
- engagement detail with workflow, billing, documents, prep/debrief, audit, and AI summary sections

User-facing localization is layered across:

- web UI strings in `packages/web-shared/src/shared/i18n/locales/*`
- localized offer/form labels stored as `LocalizedText`
- worker-generated emails using the engagement locale as the source of presentation text

## Operational Notes

- Worker handlers are written to be retry-safe by checking existing persisted state before sending email, generating meeting links, or creating follow-up records.
- Export bundles are asynchronous and complete through the outbox worker path.
