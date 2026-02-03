# Shared UI Package (`@corely/ui`)

This document defines how shared UI components and tokens are owned and used across Corely apps.

## Rules

- Reusable UI components live in `packages/ui`.
- Apps **never** import UI from another app (e.g. `apps/web`).
- Apps consume UI primitives via `@corely/ui` only (no deep imports).
- `packages/ui` must not import from `apps/*` or module-specific code.

## Tokens & Theme

- Design tokens live in `packages/ui/src/tokens.css`.
- Apps import tokens via `@import "@corely/ui/tokens.css";` in their `index.css` before Tailwind directives.
- Theme switching (if needed) should be implemented in the app layer and only manipulate CSS classes or variables.

## Adding a Shared Component

1. Add the component to `packages/ui/src` using `kebab-case` filenames.
2. Ensure it only depends on UI-safe packages and shared utilities.
3. Export it from `packages/ui/src/index.ts`.
4. Update apps to import from `@corely/ui` (or via existing shims if temporarily required).

## Adding/Updating Tokens

1. Update `packages/ui/src/tokens.css`.
2. Verify both `apps/web` and `apps/public-web` compile and render with updated tokens.

## Anti-Patterns

- Copy/pasting UI components between apps.
- Importing UI primitives from `apps/web` or other app folders.
- Introducing module-specific dependencies into `packages/ui`.
