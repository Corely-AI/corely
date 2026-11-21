# #438 Vercel and Supabase setup guide

## Tracking and outcome

- [Issue #438](https://github.com/Corely-AI/corely/issues/438). Branch `438-vercel-supabase-setup` includes `origin/development` at `197b1029`.
- [Deployment guide](../devops/vercel-supabase.md). CLI-first test deployment with Prisma migrations, API-hosted outbox processing triggered by Supabase Cron, and smoke checks for the app, invoice PDF, and workflow durability.
- Reuses the existing Vite web configuration and NestJS background endpoints. The Vercel Queues and Supabase Storage adapters are merged into `development`. [PR #463](https://github.com/Corely-AI/corely/pull/463) · [PR #462](https://github.com/Corely-AI/corely/pull/462)
- [Documentation PR #442](https://github.com/Corely-AI/corely/pull/442).

## Verification

| Check                                                                   | Result                                                                                                                                           |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Prettier, Bash syntax, local links and diff whitespace                  | Passed for the changed Markdown and guide examples                                                                                               |
| Vercel CLI version and help for project, link, and environment commands | Checked with 54.7.1 and Node.js 22.21.1                                                                                                          |
| Supabase CLI, Cron, Vault and HTTP request syntax                       | Cross-checked against provider documentation. The Supabase CLI was unavailable locally                                                           |
| Hosted app, migration, Cron, PDF and workflow acceptance                | Pending an authorized test target and working provider credentials. Vercel CLI reported no credentials and the environment had no Supabase token |

## UI/UX evidence

The change is documentation only. The deployed sign-in and persistence smoke test remains pending.

## Impact and remaining work

The runbook includes the CLI-only private bucket setup and an independent Cron smoke test based on the Tasks application event. The bucket and scheduled worker steps were checked against provider docs and the owning source. They still need a hosted run.

The runbook's adapter flags and endpoint match the merged code. The hosted run still needs to verify the API bundle and Chromium on Vercel, stored PDF downloads, and queue delivery and retry across a redeploy. Run those checks against a named Vercel and Supabase test target with authenticated CLI access.
