# Scripts Guide

This folder contains maintenance scripts for the API. All scripts run in Node/TS with `tsx`.

## Prerequisites

- `pnpm` installed
- `DATABASE_URL` set in your environment or `.env` at repo root

### Load `.env` (recommended)

```bash
set -a
source .env
set +a
```

## Run Scripts

Use `pnpm tsx` with the script path:

```bash
pnpm tsx services/api/src/scripts/<script>.ts
```

## Available Scripts

### `catalog-sync.ts`

Syncs app manifests, templates, and packs into the database.

```bash
pnpm tsx services/api/src/scripts/catalog-sync.ts
```

### `create-superadmin.ts`

Creates or updates a SuperAdmin user (host scope) and grants permissions.
You will be prompted for the password unless `CORELY_SUPERADMIN_PASSWORD` is set.

```bash
pnpm tsx services/api/src/scripts/create-superadmin.ts
```

### `update-superadmin.ts`

Ensures the SuperAdmin role and host membership for a specific user
and grants platform host permissions.

```bash
pnpm tsx services/api/src/scripts/update-superadmin.ts --email ha.doanmanh@gmail.com
```

## Troubleshooting

### `DATABASE_URL must be set`

Load `.env` or export `DATABASE_URL` before running:

```bash
export DATABASE_URL="postgresql://user:pass@host:5432/db"
```

### ESM errors (`require is not defined`)

These scripts run as ESM. Use the provided commands; do not run with `node` directly.
