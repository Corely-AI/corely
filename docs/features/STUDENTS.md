# Students Module

## Overview

Students are modeled as Parties with the `STUDENT` role, managed through the Party module (`services/api/src/modules/party`). Guardians are Parties with the `GUARDIAN` role and are linked to students for billing and contact responsibility.

## Data Model (Prisma)

Party data is stored in `packages/data/prisma/schema/45_party_crm.prisma` (schema `crm`).

- `Party` stores core identity fields like `displayName`, `vatId`, `notes`, and tags.
- `PartyRole` assigns roles such as `STUDENT` and `GUARDIAN`.
- `ContactPoint` stores email/phone contact points.
- `Address` stores billing addresses.

Guardian links are stored in extension storage `packages/data/prisma/schema/00_ext.prisma`:

- `ExtEntityLink` with `moduleId = "party"` and `linkType = "guardian_of"`.
- `fromEntityType = "Party"` and `toEntityType = "Party"`.
- `metadata` supports `isPrimaryPayer` and `isPrimaryContact`.

## API Surface

Base path: `/customers` (see `services/api/src/modules/party/adapters/http/customers.controller.ts`).

Students:

- `GET /customers?role=STUDENT`
- `GET /customers/students`
- `POST /customers` with `role: "STUDENT"`
- `GET /customers/:id?role=STUDENT`
- `PATCH /customers/:id?role=STUDENT`
- `POST /customers/:id/archive?role=STUDENT`
- `POST /customers/:id/unarchive?role=STUDENT`

Guardians:

- `GET /customers/:id/guardians`
- `POST /customers/:id/guardians`
- `DELETE /customers/:id/guardians/:guardianId`
- `POST /customers/:id/primary-payer`

## Permissions

Permissions enforced by the API controller:

- `party.customers.read` for reads.
- `party.customers.manage` for create, update, archive, and guardian changes.

## Idempotency

Guardian link and primary payer updates accept `Idempotency-Key` / `X-Idempotency-Key`.

## Frontend Surface

Routes (see `apps/web/src/app/router/app-shell-routes.tsx`):

- `/students`
- `/students/new`
- `/students/:id`
- `/students/:id/edit`

Screens live in `apps/web/src/modules/customers/screens`, with guardian management in `apps/web/src/modules/customers/components/StudentGuardiansPanel.tsx`.

## Classes Integration

Class enrollments reference `studentClientId` and `payerClientId` in `ClassEnrollment` (see `packages/data/prisma/schema/79_classes.prisma`). In practice, the payer is typically the primary guardian linked to the student.
