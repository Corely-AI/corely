# 457 Corely source release inventory

This is the shared release inventory for [#440](https://github.com/Corely-AI/corely/issues/440).
Run `pnpm app:release-inventory` from the monorepo. To save the JSON to a file,
use `pnpm --silent app:release-inventory > ../release-inventory.json`.

The inventory reads the production app registry, the shared contracts manifest,
and the API and deployed pnpm client workspace manifests. Individual apps
include dedicated extension packages when those packages exist in the checkout.
Package ownership is explicit, because the `core` runtime app and shared
`@corely/core` workflow package have different responsibilities.

Use the JSON as a source release record. Pair the reported commit with any
local modifications when reproducing a build. A single Backoffice build can
serve several apps, and OpenBuk can be embedded in that build. This inventory
lists registered runtime IDs and shared builds. It does not enumerate private
operator packages, installed entitlements, migrations, or rollout acceptance.
Use each app's runbook for its compatibility preview and disposable upgrade
rehearsal.

The inventory and two targeted tests were run with the checked-out package
sources. The command returned 32 registered IDs and seven deployed pnpm client
workspaces at the time of this change. The isolated TypeScript check passed.
