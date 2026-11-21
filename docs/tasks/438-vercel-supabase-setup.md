# #438 Vercel and Supabase setup guide

## Tracking and outcome

- [Issue #438](https://github.com/Corely-AI/corely/issues/438). Branch `438-vercel-supabase-setup`, based on `origin/development` at `b9e552413`.
- [Deployment guide](../devops/vercel-supabase.md). CLI-first test deployment with Prisma migrations, API-hosted outbox processing triggered by Supabase Cron, and smoke checks for the app, invoice PDF, and workflow durability.
- Reuses the existing Vite web configuration, NestJS background endpoints, GCS PDF storage and Cloud Tasks queue adapter. Runtime changes belong in separate tickets.

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

Validate the API bundle and Chromium binary on a deployed Vercel function, verify the actual PDF in GCS, and verify Cloud Tasks credentials and retry behavior in the deployed runtime. Durable workflows with only Vercel and Supabase would require a new queue adapter.
