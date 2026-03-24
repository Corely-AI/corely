# Subdomain Surface Gating

## Problem Statement

Corely already had tenant entitlements, workspace capabilities, permissions, and manifest-driven menu composition, but it did not treat the hostname-selected product entrypoint as a first-class access dimension.

That meant `pos.corely.one` and `crm.corely.one` could still share too much of the same web navigation, route graph, backend controller surface, and AI tool exposure.

This change introduces `SurfaceId` and applies the effective model:

`surface defaults ∩ tenant entitlements ∩ workspace capabilities ∩ user permissions`

## Current Architecture Touched

- `packages/contracts` for shared surface contracts and manifest schema extensions
- `services/api/src/shared/request-context` for trusted host resolution
- `services/api/src/modules/platform` for workspace-config and manifest-driven menu composition
- `services/api/src/shared/surface` for backend route/controller enforcement
- `packages/web-shared` and `apps/web` for browser-side surface detection, cache keys, and route guards
- `services/api/src/modules/ai-copilot` and `packages/prompts` for tool filtering and surface-aware assistant persona selection

## Chosen Design

- Add shared `SurfaceId = platform | pos | crm | shared`
- Resolve surface from trusted request host / forwarded host on the backend
- Extend app manifests and menu contributions with `allowedSurfaces`
- Thread `surfaceId` through workspace-config and menu composition
- Enforce surface restrictions on backend controllers with metadata + global guard
- Detect the browser surface on the web app for cache key separation and route guards
- Filter AI tools before model exposure and switch system prompts/persona by surface

## Surface Resolution Rules

Defined in `packages/contracts/src/platform/surface.schema.ts`.

- `pos.corely.one` => `pos`
- `restaurant.*` aliases => `pos`
- `crm.corely.one` => `crm`
- `localhost`, `127.0.0.1`, `::1`, and unknown/default hosts => `platform`
- `shared` is not resolved from hostname; it is used as an allow-any-surface marker

## Manifest / Schema Changes

- Added `SurfaceIdSchema`, `AllowedSurfacesSchema`, `resolveSurface(...)`, and `isSurfaceAllowed(...)`
- Extended `AppManifestSchema.allowedSurfaces`
- Extended `MenuContributionSchema.allowedSurfaces`
- Added `surfaceId` to `WorkspaceConfigSchema`

## Workspace Config / Menu Changes

- `RequestContextResolver` now resolves `surfaceId` from trusted host context
- `workspace-config.controller.ts` passes `surfaceId` into `GetWorkspaceConfigUseCase`
- `MenuBuilderService` now filters both app manifests and menu contributions by `allowedSurfaces`
- `WorkspaceConfig` responses now include the effective `surfaceId`
- Web workspace-config query keys now include `surfaceId` to avoid cross-surface cache bleed

## Backend Enforcement Changes

- Added `AllowSurfaces(...)` decorator and global `SurfaceGuard`
- Applied controller-level surface enforcement for:
  - CRM controllers: `platform`, `crm`
  - CRM mail controller: `platform`, `crm`
  - Restaurant controller: `platform`, `pos`
  - POS controller: `platform`, `pos`
  - Cash management controller: `platform`, `pos`
- Disallowed surface access returns `403`

## AI Tool Filtering Changes

- Added `allowedSurfaces?: SurfaceId[]` to `DomainToolPort`
- `ToolRegistry` now filters tools by surface before exposing them to the model
- Default tool surface behavior is inferred by app ownership:
  - `crm` => `platform`, `crm`
  - `restaurant`, `cash-management` => `platform`, `pos`
  - shared/common tools => `shared`
  - everything else defaults to `platform`
- `StreamCopilotChatUseCase` now passes `surfaceId` into tool selection and model invocation
- `AiSdkModelAdapter` now selects system prompts by surface:
  - `crm` => `crm.copilot.system`
  - `pos` or restaurant assistant context => `restaurant.copilot.system`
  - fallback => `copilot.system`

## Security / CORS Notes

- Backend surface resolution uses trusted `x-forwarded-host` / `host`, not a client-provided surface header
- Browser-side surface detection is used only for cache keys and route guards; it is not the server trust source
- If production traffic terminates on a separate API host, the ingress/proxy must preserve the originating host in trusted forwarded-host headers
- This change does not loosen CORS policy and does not introduce wildcard trust

## Files Changed

Key areas:

- `packages/contracts/src/platform/surface.schema.ts`
- `packages/contracts/src/platform/app-manifest.schema.ts`
- `packages/contracts/src/workspaces/workspace-config.schema.ts`
- `services/api/src/shared/request-context/*`
- `services/api/src/shared/surface/surface.guard.ts`
- `services/api/src/modules/platform/application/services/menu-builder.service.ts`
- `services/api/src/modules/platform/application/use-cases/get-workspace-config.usecase.ts`
- `services/api/src/modules/ai-copilot/*`
- `packages/prompts/src/prompts/crm.ts`
- `packages/web-shared/src/shared/surface/*`
- `packages/web-shared/src/shared/permissions/RequireSurface.tsx`
- `packages/web-shared/src/shared/workspaces/workspace-config-provider.tsx`
- `packages/web-shared/src/layout/app-sidebar.tsx`
- `apps/web/src/app/router/*`

## Tests Added

- Contracts:
  - `packages/contracts/src/__tests__/surface.schema.spec.ts`
- Request context:
  - extended `services/api/src/shared/request-context/__tests__/request-context.resolver.spec.ts`
- Menu builder:
  - extended `services/api/src/modules/platform/__tests__/menu-builder.service.spec.ts`
- AI tool registry:
  - extended `services/api/src/modules/ai-copilot/__tests__/tool-registry.spec.ts`
- Prompt registry:
  - extended `packages/prompts/src/__tests__/prompt-registry.test.ts`
- Frontend:
  - added `apps/web/src/app/router/require-auth.spec.tsx`
  - extended `apps/web/src/app/AppSidebar.spec.tsx`
- Integration:
  - extended `services/api/src/modules/workspaces/__tests__/workspaces-api.int.test.ts`

## Follow-up Work / Known Gaps

- The broad platform integration suite `services/api/src/modules/platform/__tests__/menu-app-entitlements.int.test.ts` currently has an unrelated Nest bootstrap failure in this environment, so the surface-specific menu integration added there was not validated end to end here.
- The `workspaces-api.int.test.ts` file also contains pre-existing expectations unrelated to this change; targeted surface assertions were run with test filtering instead of treating the whole file as a clean baseline.
- POS-positive workspace-config navigation coverage in the broad workspace E2E harness is still weaker than the CRM-negative assertion; lower-level menu-builder coverage and controller guards currently carry that gap.
- If separate frontend and API origins are used in production, ingress configuration must be verified so trusted forwarded-host resolution always reflects the product subdomain.
