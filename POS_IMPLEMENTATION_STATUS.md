# Kerniflow React Native POS Implementation Status

## Overview

This document tracks the implementation progress of the AI-Native, Offline-First Point of Sale (POS) system for Kerniflow.

---

## ✅ Phase 1: Foundation - COMPLETED

### Packages Created

#### 1. `packages/contracts/src/pos/` - POS Contracts ✅
**Purpose:** Shared TypeScript types and Zod schemas for POS domain

**Files:**
- `register.types.ts` - Register (POS device) type definitions
- `shift-session.types.ts` - Shift session (operating session) types
- `pos-sale.types.ts` - POS sale and ticket types with payment methods
- `create-register.schema.ts` - Register creation API contract
- `list-registers.schema.ts` - Register listing API contract
- `open-shift.schema.ts` - Shift open API contract
- `close-shift.schema.ts` - Shift close API contract
- `get-current-shift.schema.ts` - Current shift query contract
- `sync-pos-sale.schema.ts` - Sale sync endpoint contract with idempotency
- `get-catalog-snapshot.schema.ts` - Product catalog download contract

**Key Features:**
- Platform-agnostic Zod schemas (work in RN and web)
- Full type safety via `z.infer<>`
- Support for offline-first with local-first IDs
- Idempotency key support for sync operations
- Payment methods: CASH, CARD, BANK_TRANSFER, OTHER

---

#### 2. `packages/contracts/src/pos-ai/` - POS AI Tool Schemas ✅
**Purpose:** AI Copilot tool input/output schemas for POS

**Files:**
- `product-match-card.schema.ts` - Product search results from AI
- `cart-proposal-card.schema.ts` - Text-to-cart conversion results
- `upsell-card.schema.ts` - AI upsell suggestions
- `discount-risk-card.schema.ts` - Discount anomaly detection
- `shift-digest-card.schema.ts` - Shift summary with anomalies

**Key Features:**
- Structured tool-card pattern (ok, confidence, rationale, provenance)
- Aligns with existing sales-ai and inventory-ai patterns
- Ready for AI tool execution via server endpoints
- Designed for user-confirmed "Apply" actions

---

#### 3. `packages/pos-core/` - POS Business Logic ✅
**Purpose:** Platform-agnostic POS domain logic shared between web and RN

**Files:**
- `sale-builder.ts` - Calculate totals, validate sales, handle payments
- `receipt-formatter.ts` - Format sales for display/printing
- `sync-command-mapper.ts` - Map PosSale to SyncPosSaleInput
- `receipt-numbering.ts` - Generate local receipt numbers

**Key Features:**
- **No framework dependencies** - Pure TypeScript
- **No platform-specific code** - Works in any JS environment
- **Fully testable** - Pure functions and simple classes
- **Type-safe** - Uses `@kerniflow/contracts`

**Example Usage:**
```typescript
import { SaleBuilder } from "@kerniflow/pos-core";

const builder = new SaleBuilder();
const lineTotal = builder.calculateLineTotal(2, 1000, 100); // $19.00
builder.validateSale(posSale); // Throws if invalid
```

---

#### 4. `packages/offline-rn/` - Enhanced with SQLite Store ✅
**Purpose:** React Native offline sync adapters

**Files Added:**
- `src/outbox/sqliteOutboxStore.ts` - Full OutboxStore implementation
- `README.md` - Usage documentation

**Key Features:**
- SQLite-backed command queue (expo-sqlite compatible)
- Idempotency key indexing
- Status tracking (PENDING/IN_FLIGHT/SUCCEEDED/FAILED/CONFLICT)
- Error and conflict metadata storage
- Cleanup utilities for old commands

**Database Schema:**
```sql
CREATE TABLE outbox_commands (
  commandId TEXT PRIMARY KEY,
  workspaceId TEXT NOT NULL,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL,
  idempotencyKey TEXT NOT NULL,
  ...
);
CREATE INDEX idx_outbox_status ON outbox_commands(workspaceId, status);
CREATE INDEX idx_outbox_idempotency ON outbox_commands(workspaceId, idempotencyKey);
```

---

#### 5. `packages/data/prisma/schema/72_pos.prisma` - Backend Schema ✅
**Purpose:** PostgreSQL schema for server-side POS data

**Models:**
- `Register` - POS device/location with workspace scoping
- `ShiftSession` - Operating session with cash reconciliation
- `PosSaleIdempotency` - Sync deduplication mapping

**Key Features:**
- Multi-tenant scoping via `workspaceId`
- Efficient indexing for queries
- Cash variance tracking for shift close
- Idempotency key → server invoice mapping

---

## 📋 Phase 2: Backend POS Module - IN PROGRESS

### Next Steps

#### 1. Create NestJS POS Module Structure
**Location:** `services/api/src/modules/pos/`

**Required:**
- `pos.module.ts` - Module definition with providers
- `domain/` - Register and ShiftSession aggregates
- `application/` - Use cases for CQRS operations
- `infrastructure/` - Prisma repository adapters
- `adapters/http/` - REST controllers
- `adapters/tools/` - AI tool implementations

#### 2. Implement Repository Adapters
- `PrismaRegisterRepositoryAdapter`
- `PrismaShiftSessionRepositoryAdapter`
- `PrismaPosSaleIdempotencyAdapter`

#### 3. Implement Use Cases
**Register Management:**
- `CreateRegisterUseCase`
- `ListRegistersUseCase`
- `UpdateRegisterUseCase`

**Shift Management:**
- `OpenShiftUseCase` - Validate no open sessions, create new
- `CloseShiftUseCase` - Calculate totals from synced sales, compute variance
- `GetCurrentShiftUseCase` - Query open session for register

**Sale Sync:**
- `SyncPosSaleUseCase` - **Critical use case**
  - Check idempotency (return cached if duplicate)
  - Validate products exist and are active
  - Validate customer exists (if provided)
  - Create SalesInvoice via Sales module
  - Issue invoice immediately
  - Record payment(s)
  - Store idempotency mapping
  - Return server references

**Catalog:**
- `GetCatalogSnapshotUseCase` - Return product subset for offline caching

#### 4. Implement HTTP Controllers
**Endpoints:**
- `POST /pos/registers` - Create register
- `GET /pos/registers` - List registers
- `POST /pos/shifts/open` - Open shift
- `POST /pos/shifts/close` - Close shift
- `GET /pos/shifts/current?registerId={id}` - Get current shift
- `POST /pos/sales/sync` - Sync POS sale (idempotent)
- `GET /pos/catalog/snapshot` - Download products

#### 5. Implement AI Tools
**Tools:**
- `pos_findProduct` - Natural language product search
- `pos_buildCartFromText` - Text-to-cart conversion
- `pos_upsellSuggestions` - Suggest add-ons based on cart
- `pos_discountGuard` - Flag suspicious discounts
- `pos_shiftDigest` - Summarize shift with anomalies

---

## 📱 Phase 3: React Native App - PENDING

### App Structure

**Location:** `apps/pos/`

**Stack:**
- React Native (Expo or RN CLI)
- React Navigation (stack + tabs)
- React Native Paper or NativeBase (UI components)
- expo-sqlite (offline storage)
- expo-barcode-scanner (camera scanning)
- react-native-keychain (secure token storage)
- @react-native-community/netinfo (network monitoring)

### Screens to Build

**Auth Flow:**
- LoginScreen
- TenantSelectScreen (if multi-tenant)
- RegisterSelectScreen

**Shift Management:**
- OpenShiftScreen
- CloseShiftScreen

**POS Main Flow:**
- POSHomeScreen (search, cart, quick add)
- ProductSearchScreen (results list)
- CartScreen (full view with edit)
- CheckoutScreen (payment selection)
- ReceiptScreen (display, sync status)

**Utilities:**
- SyncQueueScreen (pending/failed sales)
- SettingsScreen (cache refresh, AI toggles, logout)

**AI Copilot:**
- CopilotDrawer (chat UI with tool cards)

### Core Libraries to Implement

**`apps/pos/src/lib/`**
- `api-client.ts` - Wrap `@kerniflow/api-client` with RN secure storage
- `auth-client.ts` - Token management with react-native-keychain
- `sync-setup.ts` - Initialize SyncEngine with SQLite store
- `db.ts` - SQLite database setup

**`apps/pos/src/hooks/`**
- `useAuth.tsx` - Auth context and hooks
- `useSync.tsx` - Sync status and manual trigger
- `useBarcode.tsx` - Barcode scanning logic
- `useCopilot.tsx` - AI tool invocation

**`apps/pos/src/store/` (Zustand or Jotai)**
- `authStore.ts` - User, workspace, tokens
- `cartStore.ts` - Current ticket state
- `catalogStore.ts` - Cached products
- `shiftStore.ts` - Current shift session

---

## 🧪 Phase 4: Testing & QA - PENDING

### Integration Tests
- Offline sale → sync → verify invoice created
- Conflict scenarios (product deleted, customer archived)
- Idempotency (duplicate sync returns cached result)
- Multi-device (two registers, separate shifts)

### Manual QA
- Test on real device (iPad or Android tablet)
- Test barcode scanner (camera + keyboard wedge)
- Test offline mode (airplane mode for 8 hours)
- Test sync recovery after network outage

---

## 📊 Implementation Progress

| Phase | Status | Progress |
|-------|--------|----------|
| **Phase 1: Foundation (Contracts, Core, Offline)** | ✅ Completed | 100% |
| **Phase 2: Backend POS Module** | 🚧 In Progress | 20% |
| **Phase 3: React Native App** | ⏳ Pending | 0% |
| **Phase 4: Testing & QA** | ⏳ Pending | 0% |

**Overall Progress:** ~30% Complete

---

## 🎯 Next Immediate Actions

1. ✅ Run Prisma migration to create POS tables
2. Create NestJS POS module skeleton
3. Implement core use cases (OpenShift, CloseShift, SyncPosSale)
4. Implement HTTP controllers for API endpoints
5. Test sync endpoint with Postman/curl
6. Create RN app scaffold with navigation
7. Build POSHomeScreen with product search
8. Implement offline sale finalization
9. Test end-to-end: offline sale → sync → invoice

---

## 📝 Design Decisions Made

### Architecture

**✅ Chosen: Dedicated POS Sale Aggregate**
- POS creates immutable `PosSale` locally
- Sync converts to `SalesInvoice` via Sales module
- **Pros:** Isolates offline complexity, clear conflict boundary
- **Cons:** Adds conversion step

**❌ Rejected: Direct Sales Invoice Creation**
- Would require Sales module to accept offline-first semantics
- Harder conflict handling

### Inventory Policy

**✅ Chosen: Server-Authoritative Inventory**
- Inventory decremented on server during sync
- Client shows "estimated available" from cache
- **Pros:** Prevents overselling across devices
- **Cons:** No real-time stock visibility offline

### Receipt Numbering

**✅ Chosen: Hybrid Local + Server**
- Local: `{registerPrefix}-{date}-{sequence}` (e.g., FRONT-20250315-001)
- Server: Optionally replaces with workspace-wide sequence on sync
- **Pros:** Works offline, upgradable to global numbering

---

## 🔧 Development Commands

### Install Dependencies
```bash
pnpm install
```

### Build Shared Packages
```bash
pnpm --filter @kerniflow/contracts build
pnpm --filter @kerniflow/pos-core build
pnpm --filter @kerniflow/offline-core build
pnpm --filter @kerniflow/offline-rn build
```

### Run Prisma Migration
```bash
cd packages/data
pnpm prisma migrate dev --name add_pos_tables
```

### Start Backend API
```bash
pnpm --filter @kerniflow/api dev
```

### Start RN App (When Created)
```bash
cd apps/pos
expo start
# or
pnpm start
```

---

## 📚 Documentation Links

- [Implementation Guide](./docs/architect.md) - Full POS architecture
- [POS Contracts](./packages/contracts/src/pos/) - API schemas
- [POS Core README](./packages/pos-core/README.md) - Business logic docs
- [Offline-RN README](./packages/offline-rn/README.md) - Offline sync docs

---

## ✅ Completed Deliverables

1. **POS Contracts Package** - All request/response schemas ✅
2. **POS AI Tool Schemas** - 5 AI tool card definitions ✅
3. **POS Core Package** - Platform-agnostic business logic ✅
4. **SQLite Outbox Store** - Full implementation for RN ✅
5. **POS Prisma Schema** - Backend database tables ✅
6. **Documentation** - This status document ✅

**Total Files Created:** ~25 files across 5 packages

---

## 🚀 Estimated Timeline to Production

**Completed:** ~2 weeks (Phase 1)
**Remaining:**
- Backend Module: ~1.5 weeks
- RN App Scaffold: ~1 week
- Core POS Flows: ~2 weeks
- AI Copilot Integration: ~1 week
- Testing & QA: ~1.5 weeks

**Total Estimated:** ~9 weeks (7 weeks remaining)

---

## 🎉 Success Metrics

When POS v1 is production-ready:

- ✅ Offline uptime: 100% for 8-hour shift
- ✅ Sync success rate: >99% without manual intervention
- ✅ Checkout speed: <20 seconds from scan to receipt
- ✅ AI usefulness: >30% of searches use AI finder
- ✅ Data accuracy: Zero duplicate sales on sync
- ✅ Multi-tenant: All commands workspace-scoped
- ✅ Audit trail: Every sync logged
- ✅ Shared code: 0% duplication between web and RN

---

**Last Updated:** Dec 29, 2025
**Status:** Phase 1 Complete, Phase 2 In Progress
