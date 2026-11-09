# App Center

`apps/app-center` is the thin Vite/React launcher for the approved App Center
surface. It uses the existing workspace/session boundary and staff launch
projection. It contains no Invoice or People screens, installation logic or
subscription checkout. Existing `apps/portal` routes and hosting are unchanged.

## Run and build

Follow [local focused surfaces](../guides/LOCAL_FOCUSED_SURFACES.md) to configure
trusted HTTPS origins, the API and central sign-in. Then run `pnpm dev:app-center`.
`pnpm build:app-center` builds through the configured focused-surface wrapper;
`pnpm --filter @corely/app-center build` builds the standalone static client.
The bare Vite server/preview supplies static assets only, without authenticated
session/BFF routing. It must not proxy privileged API traffic directly.

Mount the build behind the same-origin session/BFF gateway and a static-history
fallback to `index.html`. Production/staging routing belongs to SURF-19 (#399);
legacy-host migration and traffic cutover remain gated by SURF-15/SURF-24
(#396/#404). This change does not publish or route production traffic.

## Directory behavior

`WorkspaceSessionProviders` resolves authenticated memberships through the existing
workspace owner. Without a workspace hint, users explicitly select a workspace;
invalid or unauthorized hints never silently select another workspace. The chosen
workspace stays in the URL and is rebound on selection and refresh. Query caches
are isolated by user, tenant, workspace and app.

The directory calls `GET /menu/launches` through the session client. Only returned
entries with a supported launch descriptor become tiles. Search matches localized
app names; category browsing uses the descriptor's Finance/People category. No
planned app is manufactured from the long-term catalog. The server controls
visibility; absence of accessible destinations produces an empty state without
restricted metadata. App enablement remains an administrator workflow (#393).

Only enabled, available entries with a valid configured origin can open. Disabled,
unconfigured and Coming soon entries have disabled controls and a neutral reason.
Each open action refreshes the projection; removed grants or availability prevent
navigation. A workspace unmount discards a pending launch. The destination receives
only the encoded workspace hint and independently revalidates access. HR remains
Coming soon until the owning server configuration releases it. Origin/return URL
query parameters are never used to choose a destination.

The directory has its own lightweight header using shared UI controls and account/
workspace session actions. `FocusedAppShell` remains for Invoice/HR business
navigation: its required `AppLaunchId` and business menu routes intentionally do
not include App Center. The launcher reuses its launch URL validation helper.
English, German and Vietnamese copy follows browser language; unknown locales use
English. Manual search and opening apps require no AI.

## UI/UX evidence

Checked November 9, 2026 using Chromium against the production Vite preview,
synthetic authenticated staff sessions and route-mocked API responses. Desktop
1440×900 and phone 390×844: categorized directory, search/no-match, category
filtering, workspace switching, direct refresh, account-menu keyboard focus return,
sign-out, loading, empty, retryable directory error, session outage/retry, disabled
HR and access removed before launch. Invoice and synthetically released HR both
opened their configured origins with the selected workspace hint. EN/DE/VI phone
layouts had no horizontal overflow. This is browser/client evidence, not a live
issuer/API authorization or production routing test.

| Desktop                                                    | Phone                                                   |
| ---------------------------------------------------------- | ------------------------------------------------------- |
| ![App directory on desktop](images/app-center-desktop.png) | ![App directory on phone](images/app-center-mobile.png) |

| German phone                                             | Vietnamese phone                                                 |
| -------------------------------------------------------- | ---------------------------------------------------------------- |
| ![German directory](images/app-center-german-mobile.png) | ![Vietnamese directory](images/app-center-vietnamese-mobile.png) |

Additional states: [loading](images/app-center-loading.png),
[empty](images/app-center-empty.png),
[directory error](images/app-center-directory-error.png),
[session outage](images/app-center-service-error.png),
[access removed at launch](images/app-center-stale-access.png).

## Root-build review correction

The focused wrapper runs from the repository root. PostCSS explicitly selects
this app's Tailwind config, whose content paths are relative to the config file.
This keeps `pnpm dev:app-center` / `pnpm build:app-center` independent of the caller's
working directory. A production-build regression verifies shared/theme,
app-specific and responsive CSS when Vite is invoked from the repository root.

The corrected `pnpm build:app-center` output was inspected on November 9, 2026,
with synthetic session/catalog responses at 1440×900 and 390×844. Heading sizes
were 36/30 px and content padding 32/20 px respectively, with no phone horizontal
overflow; search/no-match and focus styling worked.

| Root-wrapper desktop                                                              | Root-wrapper phone                                                                     |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| ![Directory built from repository root](images/app-center-root-build-desktop.png) | ![Phone directory built from repository root](images/app-center-root-build-mobile.png) |
