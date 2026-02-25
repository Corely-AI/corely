# Corely POS (`apps/pos`)

Offline-first Expo POS client using shared Corely contracts and outbox sync semantics.

## What is implemented

- Local-first selling:
  - Catalog cached in SQLite (`catalog_products`)
  - Cart + discounts + checkout + receipt from local immutable sale record
  - Sale finalize writes local sale + outbox command in one transaction
- Shift/register:
  - Open shift, paid in/out, close shift with expected cash + variance
  - Shift actions enqueue idempotent commands for later sync
- Sync dashboard:
  - Queue filters (`PENDING`, `FAILED`, `CONFLICT`, `SUCCEEDED`)
  - Retry single/all failed, drop with confirmation, export logs
  - Last sync stats + offline/online visibility
- Adaptive shell:
  - `Layout Mode`: `AUTO | PHONE | TABLET` in settings
  - Tablet mode uses side tabs and two-pane selling layout
- Hardware abstraction:
  - `@corely/pos-hardware` manager + TSE service interfaces
  - Mock provider for simulator/dev
  - Android Kotlin Expo module scaffold for USB/TSE integration

## Offline command model

Commands are persisted to `outbox_commands` with deterministic idempotency keys:

- `pos.sale.finalize` -> `sale:<saleId>:finalize:v1`
- `pos.shift.open` -> `shift:<sessionId>:open:v1`
- `pos.shift.close` -> `shift:<sessionId>:close:v1`
- `pos.shift.cash-event` -> `shift-cash:<eventId>:v1`

Every server-impacting mutation commits local domain rows and outbox insert in the same SQLite transaction.

## UI system

- Theme tokens: `src/ui/theme.ts`
  - Primary brand color: `#003399`
  - Accent color: `#FFCC00` (sparingly for highlights/warnings)
  - Shared spacing/radius/elevation scales are used across all screens
- Reusable components: `src/ui/components.tsx`
  - `AppShell`, `TopBar`, `Card`, `Button`, `TextField`, `Badge`, `SegmentedControl`
  - `MoneyInput`, `NumericKeypad`, `EmptyState`, `ListRow`, `ModalSheet`, `Snackbar`
- Adaptive breakpoints:
  - `PHONE`: `< 720`
  - `TABLET`: `>= 720`
  - `WIDE`: `>= 1024` (for wider split panes)
  - `Layout Mode` setting (`AUTO | PHONE | TABLET`) can override Auto

## Environment

Copy `.env.example` to `.env`:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_POS_ENABLE_TSE=false
EXPO_PUBLIC_POS_REQUIRE_TSE=false
EXPO_PUBLIC_POS_HARDWARE_PROVIDER=auto
```

## Run

```bash
pnpm install
pnpm --filter @corely/pos start
```

## Validation

```bash
pnpm --filter @corely/pos type-check
pnpm --filter @corely/pos lint
```

## Native hardware (Android)

For native Kotlin module usage, run with a custom dev client/EAS build:

1. Keep `@corely/pos-hardware` plugin in `app.json`.
2. Build Android dev client.
3. Implement vendor USB logic in:
   - `packages/pos-hardware/android/src/main/java/com/corely/poshardware/CorelyPosHardwareModule.kt`
