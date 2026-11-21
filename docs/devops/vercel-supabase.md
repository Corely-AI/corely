# Deploy Corely with Vercel and Supabase

Use Vercel for the Backoffice and NestJS API, Supabase PostgreSQL for application data, and Supabase Cron to wake the API's outbox worker. Corely account creation and sign-in use the Corely API.

This is a **test deployment runbook** for a stack with two providers. Vercel hosts the web app, API and durable workflow queues. Supabase hosts PostgreSQL, Cron and private storage for invoice PDFs.

Full deployment is pending [the Vercel Queues adapter (#447)](https://github.com/Corely-AI/corely/issues/447) and [the Supabase Storage adapter (#448)](https://github.com/Corely-AI/corely/issues/448). The sections below document the base deployment and define the checks for those integrations. Fill in their tested CLI commands and runtime settings when the adapters land.

## 1. Prepare a test target

Run the Bash commands from the repository root unless a block names a different directory. Use a fresh checkout and a dedicated test Supabase project and Vercel team or projects. The Vercel projects' `production` environment serves the stable URLs of this **test** stack.

Use Node 22, the pnpm version in `package.json`, Vercel CLI 54.7.1 or a compatible version, Supabase CLI v3 with `db query`, and `curl`, `jq` and `psql` 15 or newer. Vercel CLI 54.7.1 help was checked locally. Full authenticated CLI runs and the Supabase CLI version remain to be verified.

- Supply `VERCEL_TOKEN` with access to create, link, configure and deploy projects in `VERCEL_SCOPE`. Also supply the corresponding `VERCEL_TEAM_ID`, distinct test project names in `WEB_PROJECT` and `API_PROJECT`, and their stable HTTPS origins in `WEB_ORIGIN` and `API_ORIGIN` (no trailing slash).
- Supply `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, and the test database password through a secret store. Provision the test project in the intended organization and region if needed. Check the available flags with `supabase projects create --help`.
- Supply distinct `JWT_SECRET`, `WORKER_API_SERVICE_TOKEN` and `WORKFLOW_QUEUE_SECRET` values for the test API. The invoice PDF and workflow sections describe the resources their adapters will use.
- Account creation, token issuance and domain ownership may require operator action. If test deployment protection is enabled, arrange an approved machine-access path for Supabase Cron before testing the outbox endpoint.

```bash
set -euo pipefail
git rev-parse HEAD
node --version
pnpm --version
vercel --version
supabase --version
vercel whoami --non-interactive --token "$VERCEL_TOKEN"
supabase projects list
```

Check that the output includes the intended Supabase project ref and that the Vercel identity has access to the selected team. Keep credentials out of transcripts, shell tracing, repository files and browser variables. Run commands that take secrets as arguments in an isolated deployment runner.

## 2. Connect and migrate Supabase PostgreSQL

If the test project does not exist yet, supply `SUPABASE_TEST_NAME`, `SUPABASE_ORG_ID`, `SUPABASE_REGION` and the test secret `SUPABASE_DB_PASSWORD`. Run this once and capture the project ref as `SUPABASE_PROJECT_REF`. Wait until the project is healthy in `supabase projects list`.

```bash
supabase projects create "$SUPABASE_TEST_NAME" --org-id "$SUPABASE_ORG_ID" \
  --region "$SUPABASE_REGION" --db-password "$SUPABASE_DB_PASSWORD" --yes
```

From the test project's **Connect** settings, obtain two URL values with percent-encoded credentials:

- `MIGRATION_DATABASE_URL` uses the direct endpoint when reachable or the session pooler on port 5432 when the migration runner requires IPv4. Use TLS (`sslmode=require`).
- `RUNTIME_DATABASE_URL` uses the Supabase transaction pooler on port 6543 with TLS for the Vercel API. Confirm compatibility with the repository's Prisma driver and exercise concurrent API requests against the test deployment. Start with a conservative per-instance pool budget and monitor Supabase connections.

Check the hostname or pooler username against `SUPABASE_PROJECT_REF` before migrating. The initial schema and migration history belong to Prisma.

```bash
supabase db query --remote="$SUPABASE_PROJECT_REF" --read-only \
  "select current_database(), current_user, current_setting('server_version');"
pnpm install --frozen-lockfile
DATABASE_URL="$MIGRATION_DATABASE_URL" pnpm --filter @corely/data exec prisma migrate deploy
DATABASE_URL="$MIGRATION_DATABASE_URL" pnpm --filter @corely/data exec prisma migrate status
```

Expect `migrate status` to report the schema up to date. If a migration fails, capture its name and PostgreSQL error and check the target, TLS, pooler mode and role privileges. Use Prisma's migration history to diagnose partial application before retrying.

## 3. Link and deploy the two Vercel projects

Create each project once with `vercel project add "$PROJECT" --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN" --non-interactive`, using `WEB_PROJECT` and `API_PROJECT` in turn. Record their project IDs as `WEB_PROJECT_ID` and `API_PROJECT_ID`. For existing projects, use `vercel project inspect` with the intended scope and compare the IDs before editing settings.

Configure the projects as follows. The Vercel CLI can create and link projects. Use the authenticated [Projects update API](https://vercel.com/docs/rest-api/reference/endpoints/projects/update-an-existing-project) for build settings. The example uses `curl` for that API call.

| Project | Framework | Root directory | Build command                                        | Output            |
| ------- | --------- | -------------- | ---------------------------------------------------- | ----------------- |
| API     | NestJS    | `services/api` | `cd ../.. && pnpm prisma:generate && pnpm build:api` | Framework default |
| Web     | Vite      | `apps/web`     | `cd ../.. && pnpm build:web`                         | `dist`            |

Enable source files outside the root for both projects, since the install and build depend on the pnpm workspace. Use Node 22 and verify that the build installs from the workspace lockfile. The API build must package a runnable NestJS function and its runtime assets, including Prisma and any invoice-rendering assets required by the test.

```bash
set_project_settings() {
  local project_id="$1" settings="$2"
  curl --fail-with-body --silent --show-error --request PATCH \
    --header "Authorization: Bearer $VERCEL_TOKEN" \
    --header 'Content-Type: application/json' --data "$settings" \
    "https://api.vercel.com/v9/projects/$project_id?teamId=$VERCEL_TEAM_ID" |
    jq '{id, name, rootDirectory, framework, buildCommand, outputDirectory, nodeVersion, sourceFilesOutsideRootDirectory}'
}

set_project_settings "$API_PROJECT_ID" \
  '{"framework":"nestjs","rootDirectory":"services/api","nodeVersion":"22.x","sourceFilesOutsideRootDirectory":true,"buildCommand":"cd ../.. && pnpm prisma:generate && pnpm build:api","outputDirectory":null}'
set_project_settings "$WEB_PROJECT_ID" \
  '{"framework":"vite","rootDirectory":"apps/web","nodeVersion":"22.x","sourceFilesOutsideRootDirectory":true,"buildCommand":"cd ../.. && pnpm build:web","outputDirectory":"dist"}'

link_project() {
  vercel link --yes --non-interactive --project "$1" --team "$VERCEL_SCOPE" --token "$VERCEL_TOKEN"
  jq -e --arg project "$2" --arg org "$VERCEL_TEAM_ID" \
    '.projectId == $project and .orgId == $org' .vercel/project.json >/dev/null
}

set_vercel_env() {
  printf '%s' "$2" | vercel env add "$1" production --yes --force \
    --non-interactive --token "$VERCEL_TOKEN"
}

link_project "$API_PROJECT" "$API_PROJECT_ID"
set_vercel_env APP_ENV test
set_vercel_env DATABASE_URL "$RUNTIME_DATABASE_URL"
set_vercel_env JWT_SECRET "$JWT_SECRET"
set_vercel_env API_BASE_URL "$API_ORIGIN"
set_vercel_env WEB_BASE_URL "$WEB_ORIGIN"
set_vercel_env WORKER_API_SERVICE_TOKEN "$WORKER_API_SERVICE_TOKEN"
set_vercel_env WORKFLOW_QUEUE_SECRET "$WORKFLOW_QUEUE_SECRET"
set_vercel_env CORELY_SSO_ENABLED false
set_vercel_env OUTBOX_CONCURRENCY 1
set_vercel_env PDF_RENDER_CONCURRENCY 1
```

For full deployment, configure Vercel Queues and Supabase Storage using the tested instructions from #447 and #448. Their environment variable names and binding commands are pending. Keep `WORKFLOW_QUEUE_SECRET` configured for the existing internal workflow routes, including during a base smoke test.

Deploy the API first, then the web project. Relink at the repository root and verify the project ID before each project-specific command sequence.

```bash
vercel deploy --prod --yes --non-interactive --token "$VERCEL_TOKEN"
curl --fail --silent --show-error "$API_ORIGIN/health" | jq -e '.ok == true'

link_project "$WEB_PROJECT" "$WEB_PROJECT_ID"
set_vercel_env VITE_API_BASE_URL /api
set_vercel_env VITE_API_MODE real

# Generate the test deployment routing in this disposable checkout.
jq --arg api "$API_ORIGIN" \
  '.rewrites |= ([{source:"/api/:path*",destination:($api + "/:path*")}] + .)' \
  apps/web/vercel.json > apps/web/vercel.test.json
mv apps/web/vercel.test.json apps/web/vercel.json

vercel deploy --prod --yes --non-interactive --token "$VERCEL_TOKEN"
curl --fail --silent --show-error "$WEB_ORIGIN/api/health" | jq -e '.ok == true'
```

Confirm each CLI deployment belongs to the intended team/project and is assigned to the origin in use. The test route uses Corely's standard Backoffice sign-in. Named surfaces that require trusted proxy context need the server-side header configuration in the [surface proxy guide](../guides/VERCEL_SURFACE_PROXY.md). This example exposes `/api/:path*` through the web origin. The API's internal routes require their configured service or queue credentials.

Open `$WEB_ORIGIN/auth/signup`, create an isolated test account and workspace, then sign in and create a test record. Refresh and verify the record persists. If `/health` works but sign-in or a database write fails, inspect API logs for the underlying auth or database error. If `/api/health` returns HTML or 404, check rewrite ordering, the stable API origin and whether deployment protection intercepted the request.

## 4. Schedule the worker with Supabase Cron

The worker runs in the API. Supabase Cron uses `pg_net` to call the API's authenticated `POST /internal/background/outbox/run`. Use one schedule per dedicated database. The example runs every minute, uses a two-item batch, and gives the HTTP request up to 120 seconds. Adjust the interval, batch and HTTP timeout against measured runs and the Vercel Function limit. Keep the stored token aligned with the API after rotation.

Run this from the repository root. The `psql` client is used for Vault setup so values can be passed from the environment into SQL without interpolating secrets into a saved file or placing the worker token on the process command line. The migration connection must have permission to enable the required extensions and manage Vault and Cron.

```bash
export API_ORIGIN WORKER_API_SERVICE_TOKEN
psql "$MIGRATION_DATABASE_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
\getenv api_origin API_ORIGIN
\getenv worker_token WORKER_API_SERVICE_TOKEN

begin;
create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault;

select coalesce(
  (select id from vault.secrets where name = 'corely_outbox_url'),
  vault.create_secret(:'api_origin' || '/internal/background/outbox/run', 'corely_outbox_url')
) as url_id \gset
select coalesce(
  (select id from vault.secrets where name = 'corely_outbox_token'),
  vault.create_secret(:'worker_token', 'corely_outbox_token')
) as token_id \gset
select vault.update_secret(:'url_id'::uuid, :'api_origin' || '/internal/background/outbox/run');
select vault.update_secret(:'token_id'::uuid, :'worker_token');

select cron.schedule('corely-outbox', '* * * * *', $job$
  do $run$
  declare
    request_id bigint;
  begin
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'corely_outbox_url'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-service-token', (select decrypted_secret from vault.decrypted_secrets where name = 'corely_outbox_token')
      ),
      body := '{"limit":2}'::jsonb,
      timeout_milliseconds := 120000
    ) into request_id;
    raise log 'Corely outbox pg_net request id=%', request_id;
  end;
  $run$;
$job$);
commit;
SQL
```

Run the setup again as the same database role to update the named schedule and rotate values. Check that exactly one active row exists. To disable the job, run `select cron.unschedule('corely-outbox');` against the same test target with `supabase db query --remote="$SUPABASE_PROJECT_REF" --yes`. Reference [Supabase Cron](https://supabase.com/docs/guides/cron), [pg_net](https://supabase.com/docs/guides/database/extensions/pg_net), and [Vault](https://supabase.com/docs/guides/database/vault).

### Verify the scheduled run

1. In the isolated test workspace, use a supported operation that creates a known pending outbox job and record its ID. Once #448 lands, use the invoice PDF flow below and capture its `invoice.pdf.render.requested` event. If the API's on-demand wakeup already processed the event, use another job that is still pending at the scheduled tick.
2. Use read-only CLI queries from the repository root. Replace `<request-id>` with the numeric ID from the matching Postgres log and `<event-id>` with the event ID. Check the timestamps against the Cron run and API log. The HTTP response should show processing with no errors, and the specific event must reach `SENT`.

   ```bash
   supabase db query --remote="$SUPABASE_PROJECT_REF" --read-only \
     "select jobid, active, schedule from cron.job where jobname = 'corely-outbox';"
   supabase db query --remote="$SUPABASE_PROJECT_REF" --read-only \
     "select d.runid, d.status, d.start_time, d.end_time
      from cron.job_run_details d join cron.job j using (jobid)
      where j.jobname = 'corely-outbox' order by d.start_time desc limit 5;"
   supabase db query --remote="$SUPABASE_PROJECT_REF" --read-only \
     "select id, status_code, timed_out, error_msg, content from net._http_response where id = <request-id>;"
   supabase db query --remote="$SUPABASE_PROJECT_REF" --read-only \
     "select id, status, attempts, \"updatedAt\" from workflow.\"OutboxEvent\" where id = '<event-id>';"
   ```

   To find the event ID, filter `workflow."OutboxEvent"` by the test tenant, `"eventType" = 'invoice.pdf.render.requested'` and `"payloadJson"::jsonb ->> 'invoiceId'` equal to the test invoice ID. Query promptly because the `pg_net` response table retains results for a limited time.

3. A successful Cron run shows that PostgreSQL dispatched the HTTP request. The matching API result and outbox event status establish that the job completed. For a `401`, reconcile the Vault token with the API token and check deployment protection. For a timeout, compare the Supabase HTTP deadline, Vercel invocation duration and outbox lease and retry state. [Background runtime guide](background-runtime.md)

## 5. Verify invoice PDFs in Supabase Storage

This check depends on [#448](https://github.com/Corely-AI/corely/issues/448). Use the adapter's tested CLI steps to provision a private bucket in the same Supabase project and bind its server-side configuration to the Vercel API. Record the actual bucket and credential setup here once the adapter lands.

1. Enable Invoices in the test workspace and create an invoice with an account that has PDF access. Request the PDF in the app or call `POST /invoices/:invoiceId/pdf`. Track readiness using the app or `GET /invoices/:invoiceId/pdf?waitMs=<ms>`.
2. Confirm the corresponding outbox event reaches `SENT` and the object exists in the private Supabase Storage bucket. Open the PDF from Corely's authorized download and check the invoice number. Record the Vercel deployment ID and invocation duration. Repeat after a cold start.
3. For rendering failures, check Vercel logs for the Chromium binary, shared libraries and browser launch timing. For storage failures, verify the Supabase project, bucket and credentials against the adapter configuration. [Vercel Function limits](https://vercel.com/docs/functions/limitations) · [Supabase Storage documentation](https://supabase.com/docs/guides/storage)

## 6. Verify durable workflows with Vercel Queues

This check depends on [#447](https://github.com/Corely-AI/corely/issues/447). Use the adapter's tested CLI and deployment settings to configure isolated orchestration and task-runner producers and consumers. Record the exact topic, trigger and project bindings here once the adapter lands. Supabase Cron continues to trigger the PostgreSQL outbox. [Vercel Queues documentation](https://vercel.com/docs/queues)

1. Start a harmless published workflow in the test workspace. Use delayed delivery or a fixture that keeps a step pending. Record the Vercel Queues message ID and the Corely workflow instance ID.
2. Redeploy the API to the same stable origin before that step completes. Check API health and verify the pending workflow reaches the expected state through the configured Vercel Queues consumers.
3. Exercise a transient failure so delivery retries. Capture the delivery attempts, final workflow state and exactly one observable durable effect for the step.

Record the source commit, CLI versions, deployment IDs, redacted commands and observed outcomes for sign-in and persistence, Cron, invoice PDF and workflow redeploy and retry. Disable the test Cron schedule when finished.
