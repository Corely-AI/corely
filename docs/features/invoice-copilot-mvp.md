# Invoice Copilot MVP

## Scope

MVP adds draft-only invoice email generation for staff users:

- Draft first-send invoice email (`issued/sent`)
- Draft payment reminder email
- Supported languages: `de`, `vi`, `en`
- Supported tones:
  - Issue email: `friendly`, `neutral`
  - Reminder: `polite`, `normal`, `firm`

No automatic sending is performed.

## API Endpoints

- `POST /invoices/:invoiceId/copilot/draft-issue-email`
- `POST /invoices/:invoiceId/copilot/draft-reminder`

Both endpoints:

- Require authentication + RBAC (`sales.invoices.read`)
- Are workspace-scoped through request context
- Return:
  - `subject: string`
  - `body: string`

## Safety Guardrails

- Uses canonical invoice facts from invoice aggregate/repository only
- LLM prompt requires: no guessing missing fields
- Missing bank details fallback is enforced:
  - `Please pay using the bank details shown on the invoice.`
- Reminder drafts reject if amount due is `<= 0`
- No legal threats/claims are allowed in prompt instructions
- Generated body is not persisted to logs; only hashes are stored in audit metadata

## Audit and Rate Limit

- Audit action: `invoice.copilot.email_drafted`
- Metadata includes draft type, language, tone, workspace id, and subject/body hashes
- Rate limit: `20` drafts per `10` minutes per user (via audit log count)

## UI

Invoice detail page includes a Copilot section:

- Language selector
- Reminder tone selector
- Buttons:
  - `Draft invoice email`
  - `Draft reminder`
- Modal with editable `subject` and `body`
- Copy subject/body actions

Current MVP flow is copy/paste into existing send flow (no auto-send).
