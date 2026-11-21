# Deploy Corely with Vercel and Supabase

Use Vercel for the Backoffice and NestJS API, Supabase PostgreSQL for application data, and Supabase Cron to wake the API's outbox worker. Corely account creation and sign-in use the Corely API.

This is a **test deployment runbook**. Corely's API build, Playwright/Chromium renderer, and durable workflow queue still need end-to-end evidence on Vercel. The existing invoice renderer uses Google Cloud Storage (GCS). Durable workflows use Google Cloud Tasks. The verification steps below show where those dependencies enter the deployment.

## 1. Prepare a test target

Run the Bash commands from the repository root unless a block names a different directory. Use a fresh checkout and a dedicated test Supabase project and Vercel team or projects. The Vercel projects' `production` environment serves the stable URLs of this **test** stack.

Use Node 22, the pnpm version in `package.json`, Vercel CLI 54.7.1 or a compatible version, Supabase CLI v3 with `db query`, and `curl`, `jq` and `psql` 15 or newer. Vercel CLI 54.7.1 help was checked locally. Full authenticated CLI runs and the Supabase CLI version remain to be verified.

- Supply `VERCEL_TOKEN` with access to create, link, configure and deploy projects in `VERCEL_SCOPE`. Also supply the corresponding `VERCEL_TEAM_ID`, distinct test project names in `WEB_PROJECT` and `API_PROJECT`, and their stable HTTPS origins in `WEB_ORIGIN` and `API_ORIGIN` (no trailing slash).
- Supply `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, and the test database password through a secret store. Provision the test project in the intended organization and region if needed. Check the available flags with `supabase projects create --help`.
- Supply a fresh `JWT_SECRET` and a different `WORKER_API_SERVICE_TOKEN` as secrets. For the PDF test, provision a private GCS bucket and a service identity with access to write and read its objects. For workflows, arrange Cloud Tasks access as described below.
- Account creation, token issuance and domain ownership may require operator action. If test deployment protection is enabled, arrange an approved machine-access path for Supabase Cron and Cloud Tasks before testing delivery endpoints.

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

For the PDF test, set the following on the API. The GCS adapter accepts service-account JSON in `GOOGLE_APPLICATION_CREDENTIALS`.

```bash
set_vercel_env STORAGE_PROVIDER gcs
set_vercel_env STORAGE_BUCKET "$STORAGE_BUCKET"
set_vercel_env GOOGLE_CLOUD_PROJECT "$GOOGLE_CLOUD_PROJECT"
set_vercel_env GOOGLE_APPLICATION_CREDENTIALS "$GCS_SERVICE_ACCOUNT_JSON"
```

Set `PLAYWRIGHT_LAUNCH_TIMEOUT_MS` only if startup measurements justify changing the default. Validate that Playwright can load Chromium and its system libraries inside the deployed function. A local browser install alone does not establish that the deployed function includes a compatible binary.

Provide a distinct `WORKFLOW_QUEUE_SECRET` even for a smoke test using the memory driver, since the internal workflow endpoints check this secret when configured. For the workflow test, configure the remaining API queue variables from section 5 before deployment. Deploy the API first, then the web project. Relink at the repository root and verify the project ID before each project-specific command sequence.

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

### Verify the scheduled run and invoice PDF

1. In the test workspace, enable Invoices and use an account with invoice PDF access. Create a test invoice and request the PDF in the app. The API also exposes `POST /invoices/:invoiceId/pdf` and `GET /invoices/:invoiceId/pdf?waitMs=<ms>`. Capture the invoice ID and the corresponding `invoice.pdf.render.requested` outbox event ID from the test database. An event processed by the API's on-demand wakeup verifies that handler, so use a run with a job still pending at the scheduled tick to verify Cron specifically.
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

3. Download and open the PDF. Check the invoice number against the test invoice and record the function duration and deployment ID. Repeat after a cold start. A successful Cron job means PostgreSQL queued the HTTP request. A downloaded, readable PDF and the event status establish completion.
4. For a `401`, reconcile the Vault token with the API token and check protection at the API URL. For a timeout, compare Supabase's HTTP deadline, the Vercel invocation duration, and the outbox lease/retry state. For a render failure, inspect Vercel logs for missing Chromium files, shared libraries or browser launch timeouts. For a storage failure, confirm the API identity can write, read and sign downloads for the test bucket. Check [Vercel Function limits](https://vercel.com/docs/functions/limitations) and the [background runtime guide](background-runtime.md).

## 5. Verify durable workflows

Supabase Cron drains the PostgreSQL outbox. Workflow orchestration and workflow tasks use separate queue ports. Corely's `memory` driver keeps jobs in the process. Its existing durable driver is `cloudtasks`. A Vercel and Supabase deployment without Google Cloud Tasks needs a new durable adapter to pass this check.

For the Cloud Tasks path, enable Cloud Tasks in the test Google Cloud project. The API producer and API background consumers share these Vercel API variables. Use `set_vercel_env` from section 3 after linking the API project.

| Variable                              | Test value                                                          |
| ------------------------------------- | ------------------------------------------------------------------- |
| `WORKFLOW_QUEUE_DRIVER`               | `cloudtasks`                                                        |
| `GOOGLE_CLOUD_PROJECT`                | Test Google Cloud project ID                                        |
| `WORKFLOW_CLOUDTASKS_LOCATION`        | Cloud Tasks region                                                  |
| `WORKFLOW_CLOUDTASKS_QUEUE_PREFIX`    | A unique test prefix, ending in `-`                                 |
| `WORKFLOW_CLOUDTASKS_TARGET_BASE_URL` | Stable `$API_ORIGIN` with a trailing slash                          |
| `WORKFLOW_QUEUE_SECRET`               | Separate generated secret passed by the adapter as `x-queue-secret` |

The Cloud Tasks client uses Google Application Default Credentials. Provide a supported credential configuration to the Vercel runtime with permission to inspect the queues and enqueue tasks. The adapter can try to create missing queues, so provision both queues in advance if the producer lacks create permission. Use `workflow-orchestrator` and `workflow-task-runner` with the chosen prefix. The GCS adapter's inline JSON support is specific to that adapter and is not proof that Cloud Tasks can authenticate with the same value. Verify Cloud Tasks credentials in the deployed runtime before starting the workflow test.

1. Pause delivery on the isolated test orchestrator queue. Start a harmless published workflow using the authenticated `POST /workflow/instances` endpoint. Confirm that Cloud Tasks retains a pending task and record its ID and the Corely instance ID.
2. Redeploy the API to the same stable origin. Confirm health and resume the queue. Verify that the existing task reaches `/internal/queues/workflow-orchestrator` and that the runner can consume tasks at `/internal/queues/workflow-task-runner`.
3. Exercise a retry with a test step that fails transiently, then succeeds. Capture delivery attempts, the workflow instance's final status and exactly one durable effect for that step. Use a fixture that records an observable effect in the test environment. A healthy queue or a completed instance alone cannot establish that the effect occurred once.
4. Record any missing runtime capability, including unavailable credentials or inadequate retry/idempotency behavior, with the exact failing step. Track required runtime changes separately.

Use `gcloud tasks queues pause` and `gcloud tasks queues resume` with the full prefixed queue name and explicit `--project` and `--location`. Use `gcloud tasks list --queue` with the same target to check what is queued. The Google Cloud CLI is required for these queue operations.

Record the source commit, CLI versions, deployment IDs, redacted commands and actual outcomes for the sign-in and persistence smoke test, Cron, invoice PDF, and workflow redeploy and retry. Restore paused test queues and disable the test schedule when finished.
