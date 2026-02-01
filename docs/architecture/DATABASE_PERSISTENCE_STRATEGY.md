# Corely Database Persistence Strategy

**Version:** 2.1 - Implemented  
**Date:** 2026-02-01  
**Status:** Active

---

## Intent

This document defines Corely's persistence strategy to support **1000+ modules** without exploding PostgreSQL catalog size or making migrations/ORM tooling unusable. It separates **"module packaging"** (feature delivery) from **"DB object ownership"** (persistence design).

---

## Problem Statement

**Schema-per-module does not scale:**

- PostgreSQL tables/indexes consume catalog space and slow down schema introspection
- Prisma schema generation/migration becomes unwieldy with 500+ models
- Developer tooling (autocomplete, type generation) degrades
- Migration coordination becomes a bottleneck

**The solution:** Use a **3-tier persistence model** that separates logical modules from physical schemas.

---

## Three-Tier Persistence Model

### Tier 1 — Domain Bucket Schemas (Core Relational Data)

**Target:** 10–50 PostgreSQL schemas representing bounded contexts.

**Purpose:** Core transactional data with rich relational integrity.

**Schema List:**

- `identity` — Tenants, users, roles, permissions, API keys
- `crm` — Parties, contacts, addresses, deals, activities
- `billing` — Invoices, payments, allocations, refunds
- `accounting` — Ledger accounts, journal entries, journal lines
- `inventory` — Stock locations, moves, reservations, reorder policies
- `sales` — Quotes, sales orders
- `purchasing` — Purchase orders, vendor bills
- `workflow` — Workflow definitions, instances, tasks, events
- `platform` — Apps, templates, packs, installations, menu overrides
- `reporting` — Read models, snapshots, materialized views

**Naming Convention:**

- Tables: `<domain>.<table_name>` (e.g., `crm.party`, `accounting.journal_entry`)
- No prefixes inside schemas; schema qualifies the namespace
- Clean SQL: `SELECT * FROM crm.party WHERE tenantId = $1`

**When to use:**

- Medium to large modules with complex relational needs
- Cross-module foreign keys (within reason)
- Multi-table transactions
- Rich indexing and query patterns

---

### Tier 2 — Extension Storage (Shared Primitives for Small Modules)

**Target:** `ext` schema with 3 universal storage primitives.

**Purpose:** Allow small modules to persist data **without creating new schemas/tables**.

#### Tables

**`ext.kv`** — Key-Value Storage

```sql
CREATE TABLE ext.kv (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  scope TEXT NOT NULL, -- e.g. "workspace", "user", "entity"
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, module_id, scope, key)
);

CREATE INDEX idx_kv_tenant_module ON ext.kv (tenant_id, module_id);
CREATE INDEX idx_kv_value_gin ON ext.kv USING GIN (value jsonb_path_ops);
```

**Use cases:**

- Module settings
- Small datasets (tags, categories, flags)
- Cached computed values

**`ext.entity_attr`** — Entity Attributes

```sql
CREATE TABLE ext.entity_attr (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- e.g. "Party", "Invoice"
  entity_id TEXT NOT NULL,
  attr_key TEXT NOT NULL,
  attr_value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, module_id, entity_type, entity_id, attr_key)
);

CREATE INDEX idx_entity_attr_entity ON ext.entity_attr (tenant_id, entity_type, entity_id);
CREATE INDEX idx_entity_attr_module ON ext.entity_attr (tenant_id, module_id);
CREATE INDEX idx_entity_attr_value_gin ON ext.entity_attr USING GIN (attr_value jsonb_path_ops);
```

**Use cases:**

- Custom fields attached to core entities
- Module-specific metadata (e.g., "loyalty points" on Party)
- Extensibility without schema changes

**`ext.entity_link`** — Entity Relationships

```sql
CREATE TABLE ext.entity_link (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  from_entity_type TEXT NOT NULL,
  from_entity_id TEXT NOT NULL,
  to_entity_type TEXT NOT NULL,
  to_entity_id TEXT NOT NULL,
  link_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, module_id, from_entity_type, from_entity_id, to_entity_type, to_entity_id, link_type)
);

CREATE INDEX idx_entity_link_from ON ext.entity_link (tenant_id, from_entity_type, from_entity_id);
CREATE INDEX idx_entity_link_to ON ext.entity_link (tenant_id, to_entity_type, to_entity_id);
CREATE INDEX idx_entity_link_module_type ON ext.entity_link (tenant_id, module_id, link_type);
```

**Use cases:**

- "Related items" lists
- Cross-entity associations (e.g., Invoice → Project)
- Graph-like relationships

#### Guardrails

- **Tenant scoping:** All queries MUST include `tenant_id`
- **Module isolation:** Modules cannot access other modules' keys
- **Size limits:** JSONB values should remain under 1MB (configurable)
- **Indexing:** Use GIN indexes for JSONB query acceleration

---

### Tier 3 — Heavy Module Escape Hatch

**When a module truly needs relational tables but doesn't fit a bucket:**

1. **Bucket schema with prefixed tables** (preferred):
   - Place tables in related bucket schema (e.g., `crm`, `billing`)
   - Name tables: `<moduleSlug>__<tableName>` (double underscore)
   - Example: `crm.loyalty__tier`, `crm.loyalty__points`

2. **Dedicated schema** (rare, requires approval):
   - Justification: 20+ tables, complex domain, future extraction
   - Must document integration contracts
   - Approval from architecture team

3. **Separate database** (extreme):
   - Heavy workloads (analytics, timeseries, geospatial)
   - Integrate via API/events only

---

## Module Persistence Decision Tree

```
Does the module need persistence?
│
├─ No → Domain logic only (stateless module)
│
├─ Yes → How much data?
   │
   ├─ Minimal (settings, flags, small lists)
   │  └─ ✅ Use ext.kv
   │
   ├─ Attributes on core entities (custom fields)
   │  └─ ✅ Use ext.entity_attr
   │
   ├─ Relationships between entities
   │  └─ ✅ Use ext.entity_link
   │
   ├─ 1-5 relational tables
   │  └─ ✅ Use bucket schema with prefixed tables
   │
   ├─ 5-20 tables, fits a domain bucket
   │  └─ ✅ Use bucket schema (crm, billing, etc.)
   │
   └─ 20+ tables OR requires dedicated schema
      └─ ⚠️ Requires architecture approval
```

---

## ORM Configuration (Prisma)

### Multi-Schema Support

**File:** `packages/data/prisma/schema/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
  schemas  = ["public", "identity", "crm", "billing", "accounting", "inventory", "sales", "purchasing", "workflow", "platform", "reporting", "ext"]
}
```

### Schema File Organization

```
packages/data/prisma/schema/
├── schema.prisma                 # Main config
├── 00_ext.prisma                 # Extension tables (ext schema)
├── 10_identity.prisma            # @@schema("identity")
├── 20_workspaces.prisma          # @@schema("platform")
├── 45_party_crm.prisma           # @@schema("crm")
├── 58_accounting.prisma          # @@schema("accounting")
├── 60_billing.prisma             # @@schema("billing")
└── ...
```

### Example Model Annotation

```prisma
model Party {
  id          String   @id @default(cuid())
  tenantId    String
  displayName String
  // ...

  @@schema("crm")
  @@unique([tenantId, id])
  @@index([tenantId])
}
```

---

## Migration Strategy

### Current → Target Migration Path

**Phase 1:** Introduce `ext` schema (non-breaking)

1. Create migration: `CREATE SCHEMA ext;`
2. Add extension tables
3. Deploy extension storage service
4. No changes to existing modules

**Phase 2:** Migrate core tables to bucket schemas (expand/contract)

1. Create new schemas (`identity`, `crm`, etc.)
2. Create tables in new schemas
3. Migrate data
4. Update Prisma schema with `@@schema` annotations
5. Drop old `public` tables

**Phase 3:** Migrate small modules to ext storage

1. Identify candidates (1-2 table modules)
2. Implement ext storage adapters
3. Migrate data to `ext.*` tables
4. Remove old tables

**Principle:** Always expand-contract. Never breaking change in production.

---

## Boundary Rules

**Hard rules to prevent coupling:**

1. **No cross-module DB writes:** Modules write ONLY to:
   - Their own bucket schema tables
   - `ext.*` tables scoped to their `module_id`
   - Never another module's tables

2. **Integration via contracts:**
   - Ports (interfaces)
   - Domain events (outbox)
   - Shared contracts (`@corely/contracts`)

3. **Tenant scoping is mandatory:**
   - Every query includes `WHERE tenantId = $1`
   - Unique constraints include `tenantId`
   - Indexes include `tenantId` as first column

4. **Extension storage isolation:**
   - `module_id` acts as namespace
   - Collisions prevented by unique constraints
   - No cross-module queries on ext tables

---

## Developer Guidance

### Creating a New Small Module

**Use `ext.kv` for settings:**

```typescript
import { ExtKvService } from "@corely/data";

class MyModuleSettings {
  constructor(private kv: ExtKvService) {}

  async getConfig(tenantId: string): Promise<Config> {
    return this.kv.get({
      tenantId,
      moduleId: "my-module",
      scope: "workspace",
      key: "config",
    });
  }
}
```

**Use `ext.entity_attr` for custom fields:**

```typescript
import { ExtEntityAttrService } from "@corely/data";

class LoyaltyPoints {
  constructor(private attr: ExtEntityAttrService) {}

  async getPoints(tenantId: string, partyId: string): Promise<number> {
    const attr = await this.attr.get({
      tenantId,
      moduleId: "loyalty",
      entityType: "Party",
      entityId: partyId,
      attrKey: "points",
    });
    return attr?.attrValue?.points || 0;
  }
}
```

### Creating a Medium Module

**Use bucket schema with prefixed tables:**

```prisma
// File: 77_loyalty.prisma

model LoyaltyTier {
  id          String @id @default(cuid())
  tenantId    String
  name        String
  minPoints   Int
  // ...

  @@schema("crm")
  @@unique([tenantId, id])
  @@index([tenantId])
}
```

---

## Performance Considerations

### Schema Catalog Size

- **Target:** < 10,000 tables total
- **With 50 schemas, 200 tables each:** 10,000 tables (threshold)
- **With ext tables:** Most modules avoid dedicated tables

### Query Performance

- All indexes include `tenantId` for partition pruning (future)
- GIN indexes on JSONB for `ext.*` tables
- Monitor slow queries on ext tables; migrate to relational if needed

### JSONB Best Practices

- Keep payloads small (< 100KB ideal, < 1MB limit)
- Use typed contracts for JSONB structure
- Index frequently queried paths: `CREATE INDEX ... USING GIN ((value -> 'status'))`

---

## Monitoring & Observability

**Metrics to track:**

- Schema count
- Table count per schema
- Index count
- `ext.*` table row counts by `module_id`
- JSONB payload size distribution
- Query performance on ext tables

**Alerts:**

- Schema count > 60
- Table count per schema > 300
- JSONB payload > 1MB
- Slow queries on `ext.*` (> 100ms)

---

## Appendix: Schema Bucket Assignments

| Bucket Schema | Modules Assigned                                   |
| ------------- | -------------------------------------------------- |
| `identity`    | identity, API keys, sessions                       |
| `platform`    | workspaces, apps, templates, packs, menu overrides |
| `crm`         | party, contacts, deals, activities                 |
| `billing`     | invoices, payments, allocations                    |
| `accounting`  | ledger accounts, journal entries                   |
| `inventory`   | stock, locations, moves, reservations              |
| `sales`       | quotes, sales orders                               |
| `purchasing`  | purchase orders, vendor bills                      |
| `workflow`    | workflow definitions, instances, tasks             |
| `platform`    | documents, files, links                            |
| `reporting`   | read models, snapshots, analytics aggregates       |
| `ext`         | Extension storage (kv, entity_attr, entity_link)   |

---

## Next Steps

1. ✅ Introduce `ext` schema and tables (Phase 1)
2. ✅ Build extension storage service layer
3. ✅ Migrate core tables to bucket schemas (Phase 2)
4. ⏳ Identify small module candidates for ext migration
5. ⏳ Update developer docs and module templates

---

**This strategy ensures Corely can scale to 1000+ modules while keeping the database maintainable, performant, and developer-friendly.**
