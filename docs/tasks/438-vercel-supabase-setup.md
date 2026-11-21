# #438 Vercel and Supabase setup guide

## Tracking and outcome

- [Issue #438](https://github.com/Corely-AI/corely/issues/438). Branch `438-vercel-supabase-setup`, based on `origin/development` at `b9e552413`.
- [Deployment guide](../devops/vercel-supabase.md). CLI-first test deployment with Prisma migrations, API-hosted outbox processing triggered by Supabase Cron, and smoke checks for the app, invoice PDF, and workflow durability.
- Reuses the existing Vite web configuration and NestJS background endpoints. Full acceptance depends on [the Vercel Queues adapter (#447)](https://github.com/Corely-AI/corely/issues/447) and [the Supabase Storage adapter (#448)](https://github.com/Corely-AI/corely/issues/448).
- [Draft PR #442](https://github.com/Corely-AI/corely/pull/442).

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

Validate the API bundle and Chromium on Vercel. Once #447 and #448 land, add their tested CLI settings to the runbook and verify stored PDF downloads, queue delivery across a redeploy, and retry behavior on a Vercel and Supabase test deployment.
