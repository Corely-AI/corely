# Command Palette (Phase 1)

## Overview

The Web app now includes a global launcher command palette for:

- Navigation shortcuts
- Create shortcuts
- A few global actions
- Local-only ranking using recent/frequent usage (frecency)

Phase 1 is client-only. There is no server-backed search yet.

## Keyboard Shortcut

- `Cmd + K` on macOS
- `Ctrl + K` on Windows/Linux

Behavior:

- Toggles the palette open/closed
- `Esc` closes the palette
- Backdrop click closes the palette
- Arrow keys move selection
- `Enter` runs the selected command

## Ranking and Results

- Query matching is deterministic and local.
- Matches consider `title`, `subtitle`, and `keywords`.
- Stronger boosts are applied for:
  - title prefix matches
  - exact token matches
- Additional boost is applied from local recents:
  - `log1p(count) * 0.5`
  - recency boost (max 1.5 in first 24h, decays over 14 days)

When query is empty:

- `Recent` commands are shown first
- Remaining commands are shown in grouped sections (`Navigate`, `Create`, `General`)

## Local Storage

Recents are stored in browser local storage under:

- `corely:command-recents:${namespace}`

In app wiring, namespace is:

- `${userId}:${workspaceId}`
- fallback: `anon:default`

## Command Sources (Backend SSoT)

The frontend does not hardcode navigation/create route lists.

Palette commands are rendered from `WorkspaceConfig`:

- `navigation.groups[].items` -> `Navigate` commands
- `home.widgets` quick-actions config -> `Create` commands

Current wiring lives in:

- `apps/web/src/app/AppShell.tsx`
- `apps/web/src/shared/workspaces/workspace-config-provider.tsx`

## Boundary Rules

- `app/*` imports `modules/*` and `shared/*`
- `modules/*` imports `shared/*`
- `shared/*` must not import `modules/*`
- modules should expose contribution APIs from `index.ts` (no deep-importing internals)
