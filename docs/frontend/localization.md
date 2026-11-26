# Corely localization

Corely locale IDs and display names live in [`packages/contracts/src/localization.ts`](../../packages/contracts/src/localization.ts). The registry includes English, German, Vietnamese, Turkish, Polish, Russian, European Portuguese, Italian, French, and Spanish. Browser and device tags resolve to the supported locale IDs. Explicit navigation hints take precedence over saved preferences on surfaces that accept `lang`. Public booking and signing also use HTTP language preferences. Everything added in this rollout uses left-to-right layout.

## Catalog ownership

| Surface                                                                    | Catalog owner                                                                                                                              |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Backoffice and focused product routes                                      | `packages/web-shared/src/shared/i18n/locales/` for existing i18next keys. The browser loads the seven new catalogs on demand.              |
| App Center, central sign-in, the focused shell, OpenBuk, People, and Tasks | Each owning module has a `locales/` directory for copy that used to live in its TypeScript components.                                     |
| Portal and POS                                                             | Each app owns its i18next catalogs. POS bundles its catalogs for offline use.                                                              |
| Public Web                                                                 | Booking owns its booking, checkout, and confirmation copy. Signing reuses the shared recipient catalog.                                    |
| Landing, Restaurant Listing, and Website Runtime                           | Each surface owns its catalog. Website Runtime uses the content locale for published page markup and its own catalog for runtime controls. |

Add or update English in the owning catalog first. Keep keys stable and preserve interpolation names, markup placeholders, and all plural categories required by `Intl.PluralRules`. Reuse the shared language selector and locale resolver where the app already uses the shared Web shell. Format numbers, currency, and dates in the selected locale through `Intl`, retaining the time zone and currency from the owning record.

Run `pnpm locales:check`. Frontend CI runs the same check. It compares the seven added locales against English and checks for missing keys, missing plural forms, and malformed placeholders. Inspect the rendered copy in context, especially long labels, validation messages, professional terminology, and consent text. The new catalogs were machine translated and require language review before rollout.

Current coverage includes existing catalog entries and the public flows listed above. Known remaining work includes legacy hard-coded feature screens, the rest of the marketing pages, public storefront copy, server-generated notifications, CLI help, and domain-specific copy still limited to its original supported languages. Localized customer content is managed in its owning workspace.
