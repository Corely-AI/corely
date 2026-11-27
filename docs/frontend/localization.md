# Corely localization

Corely locale IDs and display names live in [`packages/contracts/src/localization.ts`](../../packages/contracts/src/localization.ts). The registry includes English, German, Vietnamese, Turkish, Polish, Russian, European Portuguese, Italian, French, and Spanish. Browser and device tags resolve to the supported locale IDs. Explicit navigation hints take precedence over saved preferences on surfaces that accept `lang`. Public booking and signing also use HTTP language preferences. Everything added in this rollout uses left-to-right layout.

## Catalog ownership

| Surface                                                                    | Catalog owner                                                                                                                 |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Backoffice and focused product routes                                      | `packages/web-shared/src/shared/i18n/locales/` for existing i18next keys. The browser loads the seven new catalogs on demand. |
| App Center, central sign-in, the focused shell, OpenBuk, People, and Tasks | Each owning module has a `locales/` directory for copy that used to live in its TypeScript components.                        |
| Portal and POS                                                             | Each app owns its i18next catalogs. POS bundles its catalogs for offline use.                                                 |
| Public Web                                                                 | Booking owns its booking, checkout, and confirmation copy. Signing reuses the shared recipient catalog.                       |
| Invoice notifications                                                      | `packages/email-templates/src/invoices/locales/` owns the subject, preview, and rendered message copy.                        |

Add or update English in the owning catalog first. Keep keys stable and preserve interpolation names, markup placeholders, and all plural categories required by `Intl.PluralRules`. Keep each message and its parameters in one entry so translators can change the word order. Reuse shared pagination summaries, the language selector, and the locale resolver where the app uses the shared Web shell. Format numbers, currency, and dates in the selected locale through `Intl`, retaining the time zone and currency from the owning record.

Run `pnpm locales:check` to compare the seven added locales against English and check for missing keys, missing plural forms, and malformed placeholders. Inspect the rendered copy in context, especially long labels, validation messages, professional terminology, and consent text. The new catalogs were machine translated and require language review before rollout.

The rollout covers Backoffice, focused business apps, OpenBuk operations, Portal, POS, and public transactions tied to bookings and signing. Backoffice and POS use a `ui` section for screen messages that previously lived in JSX. The standalone marketing pages and storefront are outside this rollout. The remaining work includes longer business screens with inline copy, application errors without stable localization keys, and notifications without a recipient language. Localized workspace content is maintained by its owner.
