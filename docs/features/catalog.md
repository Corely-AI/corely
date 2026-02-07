# Catalog Module

## Overview

The `catalog` module introduces a bounded context for product/service master data used by import, landed cost, VAT, and excise workflows.

Key goals:

- Tenant + workspace scoped catalog entities
- Scalable SKU and variant model (10k+ SKUs)
- Reusable tax profile split (VAT + excise)
- Extensible pricing model (price lists + effective dating)

## Data Model (commerce schema)

- `CatalogItem`
  - Core master record (`code`, `name`, `type`, status, tax/uom links, shelf-life flags)
- `CatalogVariant`
  - Variant-level SKU and attributes, with separate status
- `CatalogVariantBarcode`
  - Multiple barcodes per variant
- `CatalogUom`
  - Unit records with forward-compatible conversion fields (`baseCode`, `factor`, `rounding`)
- `CatalogTaxProfile`
  - VAT basis points + optional excise type/value and effective dates
- `CatalogCategory` + `CatalogItemCategory`
  - Category hierarchy and item assignment
- `CatalogPriceList` + `CatalogPrice`
  - Currency-scoped price lists and effective-dated price rows

## API Endpoints

Base path: `/catalog`

- Items
  - `GET /items`
  - `POST /items`
  - `GET /items/:itemId`
  - `PATCH /items/:itemId`
  - `POST /items/:itemId/archive`
- Variants
  - `POST /items/:itemId/variants`
  - `PATCH /variants/:variantId`
  - `POST /variants/:variantId/archive`
- UOM
  - `GET /uoms`
  - `POST /uoms`
- Tax Profiles
  - `GET /tax-profiles`
  - `POST /tax-profiles`
- Categories
  - `GET /categories`
  - `POST /categories`
- Price Lists
  - `GET /price-lists`
  - `POST /price-lists`
- Prices
  - `GET /prices`
  - `POST /prices`

All list endpoints follow `q`, `page`, `pageSize` and return `{ items, pageInfo }`.

## Boundaries and Integration

- Catalog is its own module and does not perform direct table reads/writes into sales, purchasing, or inventory modules.
- Cross-module integration recommendation:
  - Store `catalogItemId` / `catalogVariantId` in consuming modules.
  - Resolve display data through Catalog HTTP APIs in UI/API composition.
  - Build read models asynchronously from outbox events where denormalization is needed.

## Events and Audit

Mutating operations emit audit logs and outbox events.

Current event names:

- `catalog.item.created`
- `catalog.item.updated`
- `catalog.item.archived`
- `catalog.variant.created`
- `catalog.variant.updated`
- `catalog.variant.archived`
- `catalog.tax-profile.changed`

## Idempotency

Create/upsert endpoints accept idempotency keys from payload or HTTP header (`Idempotency-Key`).

## Frontend Routes

- `/catalog/items`
- `/catalog/items/new`
- `/catalog/items/:id`
- `/catalog/items/:id/edit`
- `/catalog/uoms`
- `/catalog/tax-profiles`
- `/catalog/categories`
