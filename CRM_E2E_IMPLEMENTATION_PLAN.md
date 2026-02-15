# CRM E2E Implementation Plan

**Date**: February 15, 2026
**Status**: In Progress
**Branch**: CRM-v2

## Overview

Implement missing CRM features to enable complete E2E test coverage following architecture patterns in `docs/architecture/architect.md` and `docs/architecture/BOUNDARIES.md`.

## Priority Order (P0 → P1 → P2)

### ✅ COMPLETED

- Leads CRUD (already implemented with test-ids)
- Deals CRUD (already implemented with test-ids)
- Activities + Timeline (already implemented with test-ids)
- Sequence Backend (domain, use-cases, repositories)

### 🚧 P0 - CORE E2E UNBLOCKING (NEXT)

#### 1. Accounts CRUD UI/Routes

**Status**: Not Started
**Routes**:

- `/crm/accounts` (list)
- `/crm/accounts/new` (create)
- `/crm/accounts/:id` (detail)
- `/crm/accounts/:id/edit` (edit)

**Backend**:

- [ ] Domain: AccountAggregate (Party module extension)
- [ ] Contracts: Account types + schemas in `@corely/contracts/crm/account.types.ts`
- [ ] Use cases: create-account, update-account, get-account, list-accounts
- [ ] HTTP: AccountsController with auth + RBAC
- [ ] Audit + outbox on mutations

**Frontend**:

- [ ] AccountsPage (list with search/filter)
- [ ] AccountDetailPage (timeline + associations)
- [ ] AccountFormPage (new/edit)
- [ ] API client methods in `apps/web/src/lib/crm-api.ts`

**Test IDs** (Required):

```typescript
"crm-accounts-list";
"crm-accounts-create";
"crm-accounts-row-{id}";
"crm-account-save";
"crm-account-edit";
"crm-account-title";
"crm-accounts-page";
"crm-accounts-empty";
```

**E2E Acceptance**:

- Create account → visible in list
- Edit account → persists after refresh
- Detail page shows timeline

---

#### 2. Contacts CRUD + Bidirectional Associations

**Status**: Not Started
**Routes**:

- `/crm/contacts` (list)
- `/crm/contacts/new` (create)
- `/crm/contacts/:id` (detail)
- `/crm/contacts/:id/edit` (edit)

**Backend**:

- [ ] Domain: ContactAggregate
- [ ] Contracts: Contact types + ContactAccountAssociation schema
- [ ] Use cases: create-contact, update-contact, link-contact-account, unlink-contact-account
- [ ] Repository: ContactRepository with association queries
- [ ] HTTP: ContactsController + ContactAssociationsController

**Frontend**:

- [ ] ContactsPage (list)
- [ ] ContactDetailPage (shows associated accounts panel)
- [ ] AccountDetailPage enhancement (shows contacts panel)
- [ ] AssociationPicker component (reusable)

**Test IDs** (Required):

```typescript
"crm-contacts-list";
"crm-contacts-create";
"crm-contact-save";
"crm-contacts-row-{id}";
"crm-contact-assoc-add";
"crm-contact-assoc-remove";
"crm-account-contacts-panel";
"crm-contact-accounts-panel";
```

**E2E Acceptance**:

- Link contact ↔ account → visible on both pages
- Unlink → removed from both pages
- Prevent duplicate associations

---

#### 3. Lead Conversion Polish

**Status**: Partially Done (backend works, UI needs polish)
**Current**: Basic conversion exists
**Needed**: Rich conversion wizard + cross-links

**Backend**:

- [x] ConvertLeadUseCase exists
- [ ] Enhance to create timeline events on Account/Contact
- [ ] Return conversion summary with all created IDs

**Frontend**:

- [ ] ConversionWizardModal with steps:
  1. Detect/match existing account/contact
  2. Choose: create new vs link existing
  3. Show conversion summary with clickable links
- [ ] Update LeadDetailPage to show "Converted Deal" link
- [ ] Timeline entries show "Lead Converted" system event

**Test IDs** (Required):

```typescript
"crm-lead-convert-select-account";
"crm-lead-convert-select-contact";
"crm-lead-convert-confirm";
"crm-lead-convert-result-deal";
"crm-lead-convert-result-account";
"crm-lead-convert-result-contact";
```

**E2E Acceptance**:

- Convert lead → see links on all 3 pages (deal/account/contact)
- Timeline shows conversion event

---

#### 4. AI Tool-Card Mutation (Deterministic)

**Status**: Not Started
**Goal**: Make AI mutations deterministic for E2E

**Backend**:

- [ ] Create `AiCrmProvider` interface
- [ ] Implement `DeterministicCrmAiProvider` (stub for E2E)
- [ ] Implement `RealCrmAiProvider` (production)
- [ ] Provider selection based on `E2E_MODE` env var
- [ ] Tool cards return structured proposals (not direct mutations)
- [ ] Mutation endpoint: POST /crm/ai/apply-mutation

**Frontend**:

- [ ] AI Copilot panel enhancement
- [ ] Tool card rendering from proposal
- [ ] Dismiss button (no action)
- [ ] Accept button → calls apply endpoint → shows toast → timeline entry

**Test IDs** (Required):

```typescript
"copilot-open";
"copilot-input";
"copilot-send";
"copilot-toolcard";
"copilot-toolcard-dismiss";
"copilot-toolcard-accept";
"crm-ai-mutation-toast";
"crm-timeline-item-ai-mutation";
```

**E2E Acceptance**:

- Ask AI to propose update → see tool card
- Dismiss → no changes
- Accept → mutation applied + timeline entry

---

### 📋 P1 - ADVANCED E2E

#### 5. Custom Properties

**Status**: Not Started
**Routes**: `/crm/settings/custom-fields`

**Implementation**:

- [ ] CustomFieldDefinition entity (per object type)
- [ ] CustomFieldValue storage
- [ ] UI for definition management
- [ ] Dynamic form rendering on record pages
- [ ] List filtering by custom fields

**Test IDs**:

```typescript
"crm-custom-fields-nav";
"crm-custom-field-create";
"crm-custom-field-save";
"crm-list-filter-custom-field";
```

---

#### 6. Tickets CRUD

**Status**: Not Started
**Routes**:

- `/crm/tickets`
- `/crm/tickets/new`
- `/crm/tickets/:id`

**Implementation**:

- [ ] Ticket entity (status, priority, assignee)
- [ ] Link to account/contact/deal
- [ ] Timeline integration
- [ ] Status workflow

**Test IDs**:

```typescript
"crm-tickets-list";
"crm-ticket-create";
"crm-ticket-save";
"crm-ticket-link-account";
"crm-ticket-status";
```

---

### 🔧 P2 - AUTOMATION E2E

#### 7. Sequence Authoring UI

**Status**: Backend Done, UI Not Started
**Current**: Backend sequence engine exists
**Needed**: UI builder + enrollment flow

**Implementation**:

- [ ] SequenceBuilderPage (drag-drop steps)
- [ ] Enrollment UX from Contact/Deal pages
- [ ] Deterministic job runner: POST /internal/e2e/run-due-jobs

**Test IDs**:

```typescript
"crm-sequences-list";
"crm-sequence-create";
"crm-sequence-step-add";
"crm-sequence-enroll";
```

---

#### 8. Workflow Automation Hooks

**Status**: Not Started
**Goal**: Deterministic workflow verification

**Implementation**:

- [ ] System activity type: AUTOMATION_EVENT
- [ ] Timeline logging for workflow executions
- [ ] Deterministic trigger endpoint

**Test IDs**:

```typescript
"crm-timeline-item-automation";
```

---

## Implementation Rules

### Architecture Adherence

1. **Clean Architecture**: Domain → Application (ports/use-cases) → Infrastructure → Adapters
2. **Contracts First**: All schemas in `@corely/contracts`, Zod validation
3. **No Cross-Module DB Writes**: Use events/outbox for integration
4. **Audit + Outbox**: All mutations must audit + emit events

### Frontend Standards

1. **Data-testid Required**: Every E2E-touched element needs stable testid
2. **No waitForTimeout**: Use explicit signals (URL changes, toasts, API responses)
3. **Query Keys**: Follow pattern `['crm', resource, ...filters]`
4. **Loading/Error States**: All pages handle loading/empty/error states

### Backend Standards

1. **Auth + RBAC**: All endpoints protected
2. **Idempotency**: Use idempotency adapters
3. **Validation**: Zod schemas on all inputs
4. **Consistent Responses**: List endpoints return pageInfo

---

## Next Steps

1. ✅ Read architecture docs
2. ✅ Understand E2E patterns
3. ⏭️ Implement P0-1: Accounts CRUD (contracts → backend → frontend → E2E)
4. ⏭️ Implement P0-2: Contacts CRUD + associations
5. ⏭️ Implement P0-3: Lead conversion polish
6. ⏭️ Implement P0-4: AI tool-card deterministic flow

---

## Files to Create/Modify

### P0-1: Accounts

**New Files**:

- `packages/contracts/src/crm/account.types.ts`
- `services/api/src/modules/crm/domain/account.aggregate.ts`
- `services/api/src/modules/crm/application/use-cases/create-account/`
- `services/api/src/modules/crm/application/use-cases/update-account/`
- `services/api/src/modules/crm/adapters/http/accounts.controller.ts`
- `services/api/src/modules/crm/infrastructure/prisma/prisma-account-repo.adapter.ts`
- `apps/web/src/modules/crm/screens/AccountsPage.tsx`
- `apps/web/src/modules/crm/screens/AccountDetailPage.tsx`
- `apps/web/src/modules/crm/screens/AccountFormPage.tsx`
- `apps/web/src/modules/crm/components/AccountCard.tsx`

**Modified Files**:

- `services/api/src/modules/crm/crm.module.ts`
- `apps/web/src/lib/crm-api.ts`
- `apps/web/src/routes.tsx`
- `apps/e2e/tests/crm.spec.ts`
- `apps/e2e/utils/selectors.ts`

---

## Success Criteria

### P0 Complete When:

- [ ] All P0 E2E placeholders replaced with real tests
- [ ] All tests pass deterministically
- [ ] No flaky timeouts
- [ ] Full CRUD coverage for Accounts + Contacts
- [ ] Lead conversion shows cross-links
- [ ] AI mutations are testable

### Code Quality:

- [ ] All contracts use Zod
- [ ] All endpoints have auth + validation
- [ ] All UI has loading/error states
- [ ] All E2E elements have testids
- [ ] No cross-module DB writes
- [ ] Audit logs for all mutations
