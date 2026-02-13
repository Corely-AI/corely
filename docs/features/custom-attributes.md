# Custom Attributes Framework

## Overview

Corely now supports cross-module custom attributes with two primitives:

- Dimensions: reporting segments assigned to entity records
- Custom fields: admin-defined typed fields with optional indexing and layout

Initial entity targets:

- `expense`
- `party`

## Dimensions

Dimensions are tenant-scoped and managed in Platform settings.

Data model:

- `platform.DimensionType`
- `platform.DimensionValue`
- `platform.EntityDimension`

Key behaviors:

- `appliesTo` controls which entity types can use a dimension
- `requiredFor` enforces mandatory assignments by entity type
- `allowMultiple` controls single vs multi-value assignment
- list filtering supports AND semantics across dimension types and IN semantics within a type

APIs:

- `GET /platform/dimensions/types`
- `POST /platform/dimensions/types`
- `PATCH /platform/dimensions/types/:id`
- `DELETE /platform/dimensions/types/:id`
- `GET /platform/dimensions/types/:id/values`
- `POST /platform/dimensions/types/:id/values`
- `PATCH /platform/dimensions/values/:id`
- `DELETE /platform/dimensions/values/:id`
- `GET /platform/dimensions/entities/:entityType/:entityId`
- `PUT /platform/dimensions/entities/:entityType/:entityId`

## Custom Fields

Custom field definitions and layout remain in the existing customization system and include entity targets `expense` and `party`.

Entity values are managed via platform custom-field entity APIs and persisted in extension storage (`ext.entity_attr`) plus searchable indexes (`platform.CustomFieldIndex`).

APIs:

- `GET /customization/custom-fields?entityType=...`
- `POST /customization/custom-fields`
- `PUT /customization/custom-fields/:id`
- `DELETE /customization/custom-fields/:id`
- `GET /customization/layouts/:entityType`
- `PUT /customization/layouts/:entityType`
- `GET /platform/custom-fields/entities/:entityType/:entityId`
- `PUT /platform/custom-fields/entities/:entityType/:entityId`
- `DELETE /platform/custom-fields/entities/:entityType/:entityId`
- `GET /platform/custom-fields/indexed?entityType=...`

## Party Social Links

Party social links are implemented as repeatable contact points (`type = SOCIAL`) with:

- `platform`
- `url`
- `label`
- `isPrimary`

These are available in customer forms and customer DTOs under `socialLinks`.

## Cleanup

When entities are deleted/archived and emit `platform.entity.deleted`, worker cleanup removes:

- `platform.EntityDimension` rows
- `platform.CustomFieldIndex` rows
- `ext.ExtEntityAttr` custom-field values (module `customization`)
