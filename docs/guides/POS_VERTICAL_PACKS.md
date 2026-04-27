# POS Vertical Packs

Corely runs a single POS host: `pos.corely.one`.

The host establishes only the trusted product surface:

- `surfaceId = "pos"` comes from the Vercel-injected `x-corely-proxy-key`
- the API does not trust `Origin`, `x-corely-surface`, or any browser-sent vertical header

The business vertical is a separate server-side dimension:

- `verticalId = "restaurant" | "nails" | "retail"`
- `verticalId` is stored on `platform.Workspace.verticalId`
- POS flows fail closed when a trusted POS request does not have a configured workspace vertical

## Runtime Model

Every POS request resolves an experience context from:

- trusted `surfaceId`
- workspace `verticalId`
- tenant entitlements
- workspace capabilities
- user permissions

Menus, workspace config, capability guards, and AI tool filtering all consume the same evaluated context.

## Targeting Metadata

Manifests and tools can declare:

- `allowedSurfaces`
- `allowedVerticals`
- `requiredCapabilities`
- `requiredPermissions`

The shared evaluator grants visibility only when all declared constraints match the resolved experience context.

## Current Packs

- `restaurant`: floor plan, kitchen queue, restaurant copilot tools
- `nails`: appointments and service-board pack
- `retail`: quick-sale and catalog lookup pack

Shared POS modules stay on the baseline `pos` surface without per-host forks.
