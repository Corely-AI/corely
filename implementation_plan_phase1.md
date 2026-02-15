# Phase 1 Implementation Plan: Core CRM Records & Leads

## Overview
This phase establishes the core CRM entities linked to the `Deals` system. We will enhance the existing `Party` module to support distinct `Individual` (Contact) and `Organization` (Company) records, and introduce a dedicated `Lead` entity in the `CRM` module for pre-qualification intake.

## 1. Domain & Schema Changes

### A. Customer/Party Module (`services/api/src/modules/party`)
**Goal**: Harden `Party` into first-class `Contact` and `Company` records.

**Schema Updates (`packages/data/prisma/schema/45_party_crm.prisma`)**:
- Add `PartyKind` enum: `INDIVIDUAL`, `ORGANIZATION`.
- Add fields to `Party`:
  - `kind`: `PartyKind` (default INDIVIDUAL for migration).
  - `firstName`, `lastName`: String (nullable, for Individuals).
  - `organizationName`: String (nullable, for Organizations).
  - `industry`: String (nullable).
  - `website`: String (nullable).
- New Model: `PartyRelationship`
  - `fromPartyId`, `toPartyId`, `type` (e.g. `WORKS_FOR`), `title` (Job Title).

**Domain Updates**:
- Update `PartyAggregate` to handle `kind` and new fields.
- New Use Cases:
  - `CreateOrganizationUseCase`
  - `CreateIndividualUseCase`
  - `LinkPartyUseCase` (Create relationship)

### B. CRM Module (`services/api/src/modules/crm`)
**Goal**: Manage Leads and Deal Associations.

**Schema Updates**:
- New Model: `Lead` (in `45_party_crm.prisma` or new `46_leads.prisma` in `crm` schema)
  - `id`, `tenantId`, `source`, `status` (NEW, QUALIFIED, DISQUALIFIED, CONVERTED).
  - `firstName`, `lastName`, `companyName` (unstructured).
  - `email`, `phone`.
  - `ownerUserId`.
  - `convertedDealId`, `convertedPartyId`.
- Update `Deal`:
  - Add `companyId` (optional link to Organization Party).

**Domain Updates**:
- `LeadAggregate`: Handles status interaction and conversion logic.
- `ConvertLeadUseCase`:
  - Matches/Creates Party (Individual & Organization).
  - Creates Deal.
  - Updates Lead to CONVERTED.

## 2. Contracts (`packages/contracts`)

- [x] **Domain & Schema**:
  - [x] Update `Party` model (add `kind`, `firstName`, etc.).
  - [x] Create `Lead` model & enums (`LeadStatus`, `LeadSource`).
  - [x] Update `PartyAggregate` logic.
  - [x] Create `LeadAggregate`.

- [x] **Contracts**:
  - [x] Update `PartyDto` & `CreateCustomerInput`.
  - [x] Create `LeadDto`, `CreateLeadInput`, `ConvertLeadInput`.

- [x] **Backend Implementation**:
  - [x] Update `PrismaPartyRepoAdapter`.
  - [x] Create `PrismaLeadRepoAdapter`.
  - [x] Update `CreateCustomerUseCase`.
  - [x] Create `CreateLeadUseCase`.
  - [x] Create `ConvertLeadUseCase` (Orchestration).
  - [x] Create `LeadsController`.
  - [x] Register in `CrmModule`.

- [x] **Frontend Implementation**:
  - [x] Update `crm-api.ts`.
  - [x] Create `LeadCard` component.
  - [x] Create `LeadsPage` (List).
  - [x] Create `LeadDetailPage` (View + Convert).
  - [x] Create `NewLeadPage` (Create).
  - [x] Register routes (`/crm/leads`, etc.).

- [x] **AI Copilot**:
  - [x] Create `GetDealSummaryTool` (Backend).
  - [x] Register tool in `CrmModule`.
  - Returns summarized text.

## 5. Migration Strategy
- Run `prisma migrate dev`.
- Backfill existing Parties as `INDIVIDUAL` (default).

## Execution Steps
1.  **Contracts**: Define new schemas.
2.  **Schema**: Update Prisma definition.
3.  **Party Module**: Update Domain & Application Services.
4.  **CRM Module**: Implement Leads & Conversion.
5.  **UI**: Build new screens.
