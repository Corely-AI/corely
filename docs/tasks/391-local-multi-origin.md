# 391 — Reproducible local multi-origin development

- Issue: [SURF-18 #391](https://github.com/Corely-AI/corely/issues/391), parent #380.
- Hard prerequisites #381 and #382 are completed.
- Branch `391-local-multi-origin`, base `origin/development` at
  `cd65d39814930a3647476f2007a6f707a36608d5`. #390/PR #415 is not included.
- Draft PR: [#416](https://github.com/Corely-AI/corely/pull/416), targeting
  `development`. Project status: In progress.

## Reuse and delivery

Reuse Corely-native Identity SSO, exact registration/callback policy, trusted proxy
ingress, secure host-only cookies, existing login Vite client and one API. Add only
local tooling, validated public/private environment projections, scripts, tests and
setup documentation. No new domain owner, identity provider, database, schema,
migration, account seed, hosts-file edit, CA installation or production change.

The App Center/Invoice/HR client directories are not on the verified base. Their
composition belongs to #392/#394/#397. The runner fails explicitly on missing
clients, supports selecting login plus one app, and offers labeled origin probes
to exercise the real local HTTPS ingress before those clients land. A probe is not
a product implementation. Existing dev commands are unchanged.

## Verification

- `focused:init` generated fresh private local keys without printing them;
  `focused:check` validated/printed only public topology and derived callbacks.
- `pnpm test:focused-dev`: 14 passed (missing/malformed settings, exact/unique
  origins, loopback API and rejection of browser-exposed secrets).
- `pnpm test:focused-dev:int`: 7 passed against real test-owned HTTP/HTTPS sockets;
  fixed origin/proxy key, spoof stripping, callback query, cookie attributes,
  unregistered host rejection and probe separation. No existing API/database used.
- Script and config-package typechecks and targeted ESLint passed.
- `pnpm build:focused --surface=login` passed using the real login Vite build.
- `pnpm dev:focused --probe` started all four origins; HTTPS requests to the four
  Hosts returned the real login entry and explicitly labeled probes.
- Chromium used its normal certificate validation with the generated local mkcert
  certificate (no ignore-HTTPS-errors setting). The Invoice probe and real login
  expired-request state rendered in English at 1280×720. No credentials submitted
  or messages sent. The initial English text assertion under a German default
  locale was corrected by setting the smoke browser's locale explicitly.
- [Clean-install/start CI run](https://github.com/Corely-AI/corely/actions/runs/42602953955)
  passed install, initialization, 21 tests, typecheck, login build and four-origin
  startup on implementation commit `ca9fd5b2`. It uses a disposable certificate
  and test-owned upstream; no SSO database acceptance is inferred.

## Evidence and limits

[Setup and evidence](../guides/LOCAL_FOCUSED_SURFACES.md) documents host/certificate
setup, one-client/full-origin commands, cookie/callback behavior, sender/API
prerequisites, public/private configuration and the separate DB-backed SSO suite.
Browser captures show developer transport and retained login, not new product UX.
No phone/locale redesign is introduced. No database-backed login, real email send
or future App Center/Invoice/HR feature flow was run here.

The global pre-push hook's prior unrelated cash-database failure remains a known
limitation; staged-file checks and scoped validation are used, with the hook's
documented `HUSKY=0` bypass for publication. No repository-wide green result is
claimed. No merge or deployment is performed.
