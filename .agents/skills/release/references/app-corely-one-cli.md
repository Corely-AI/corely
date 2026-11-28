# Release app.corely.one from the CLI

Production uses `soloroute/corely-web` on Vercel with `apps/web` as its root directory, and
`corely-api` on Google Cloud Run in project `oneway8x-portfolio`, region `europe-west4`.
The API at `https://api.corely.one` uses Supabase PostgreSQL through the session pooler on
port `5432` with certificate verification. Recheck these bindings before each release.

Follow the [release skill](../SKILL.md) and record the release ticket before execution. Run the
examples manually in Bash on the local computer from an isolated checkout of the selected commit.
Use the repository's pnpm version, the Vercel project's Node version for local web builds, an
authenticated Vercel CLI and `gcloud`, and Docker with `linux/amd64` build support. The traffic
check uses `jq`.

## Select the source and capture the current release

Verify the production remote and fetch its `main` branch. For a request to release the latest
version, use the fetched `main` tip. Verify a selected SHA against that branch, for example with
`git merge-base --is-ancestor <sha> origin/main` when `origin` is the verified remote. Stop if
`main` is unavailable or the commit cannot be verified. Use `git worktree add --detach` for a
clean checkout of the verified SHA. Record the current Vercel deployment URL and Cloud Run traffic
allocation for rollback. If both live artifacts already match the requested SHA and pass the
release checks, report the verified release. An explicit redeploy request may still call for a new
deployment.

```bash
release_sha=$(git rev-parse HEAD)
gcp_project=oneway8x-portfolio
region=europe-west4
service=corely-api
vercel_scope=soloroute
vercel_project=corely-web
api_origin=https://api.corely.one
web_origin=https://app.corely.one
registry="$region-docker.pkg.dev"
api_repository="$registry/$gcp_project/corely-images/api"

vercel inspect "$web_origin" --scope "$vercel_scope"
vercel api "/v9/projects/$vercel_project/domains" --scope "$vercel_scope"
gcloud run services describe "$service" --project "$gcp_project" --region "$region" \
  --format='json(status.traffic,status.latestReadyRevisionName)'
```

Match Vercel deployment metadata `corelyReleaseCommit` and the Cloud Run traffic-serving
revision's image digest against the release artifacts. Read the active template's database binding
with secret values suppressed. The older GitHub deploy and migration path has used an Azure
connection. Use the image-only CLI deployment below to preserve the verified Supabase connection,
TLS certificate mount, service identity, and environment bindings.

## Build and publish the API image

Reuse a verified image for the exact commit if available. Otherwise build from the checkout
using `Dockerfile.api`, with no production connection strings in the build context.

```bash
api_image="$api_repository:$release_sha"
docker build --platform linux/amd64 --file Dockerfile.api \
  --label "org.opencontainers.image.revision=$release_sha" --tag "$api_image" .

storage_check='const fromStorage = require("node:module").createRequire("/app/packages/storage/package.json"); fromStorage.resolve("@aws-sdk/client-s3"); fromStorage.resolve("@aws-sdk/s3-request-presigner");'
docker run --rm --network none --entrypoint node "$api_image" -e "$storage_check"
```

If the Dockerfile builds but the storage probe fails with `MODULE_NOT_FOUND` for those AWS SDK
packages, reinstall the API workspace dependency closure after the complete sources are in place.
This is how the previous production image recovered the missing runtime links. Retest the final
image before pushing it.

```bash
runtime_image="$api_repository:$release_sha-runtime"
docker build --platform linux/amd64 --file - --build-arg "BASE_IMAGE=$api_image" \
  --tag "$runtime_image" . <<'DOCKERFILE'
ARG BASE_IMAGE
FROM ${BASE_IMAGE}
RUN pnpm --filter @corely/api... install --frozen-lockfile
DOCKERFILE
api_image="$runtime_image"
docker run --rm --network none --entrypoint node "$api_image" -e "$storage_check"
```

```bash
gcloud auth configure-docker "$registry" --quiet
docker push "$api_image"
api_digest=$(gcloud artifacts docker images describe "$api_image" --project "$gcp_project" \
  --format='value(image_summary.fully_qualified_digest)')
[[ "$api_digest" == "$api_repository@sha256:"* ]]
```

Use the resulting `repository@sha256:…` for deployment. [Artifact Registry CLI](https://cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/describe)

## Check Supabase and stage the API

In the local release checkout at the verified SHA from `main`, install dependencies with
`pnpm install --frozen-lockfile` and supply Prisma's `DATABASE_URL` securely from the production
secret store. Use the verified Supabase project with a direct or session-mode migration connection
and a trusted CA. Check the target and ledger before any write.

```bash
: "${DATABASE_URL:?Load the verified production migration connection}"
NODE_ENV=production pnpm --filter @corely/data exec prisma migrate status
```

Apply pending migrations only during an authorized release of a new version. Establish a verified
backup and compatibility with the current and candidate API, run
`NODE_ENV=production pnpm prisma:migrate` (`prisma migrate deploy`), and recheck status. During
that same release, handle a legacy ledger with the
[Prisma baseline adoption runbook](../../../../docs/devops/prisma-baseline.md) if applicable.
Use read-only status and compatibility checks for same-version redeployments and rollbacks.
Resolve a failed or partial migration before changing traffic.
[Supabase connection modes](https://supabase.com/docs/guides/database/connecting-to-postgres)

Stage the verified digest with zero traffic. Use a unique revision suffix for an explicit redeploy
of the same source. A tagged smoke check can start an API instance, so check startup and background
worker compatibility with the shared database before staging.

```bash
candidate_tag="r-${release_sha:0:8}"
candidate_revision="$service-$candidate_tag"
gcloud run deploy "$service" --project "$gcp_project" --region "$region" \
  --image "$api_digest" --revision-suffix "$candidate_tag" --tag "$candidate_tag" --no-traffic
candidate_api_url=$(gcloud run services describe "$service" --project "$gcp_project" \
  --region "$region" --format=json | jq -er --arg tag "$candidate_tag" \
  '.status.traffic[] | select(.tag == $tag) | .url')
curl -fsS "$candidate_api_url/health"
```

Verify the revision's resolved digest, readiness, and retained Supabase binding. Use an authorized
database-backed smoke check when available. `/health` checks the API process.
[Cloud Run traffic management](https://docs.cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration)

## Stage the Vercel build

Run from the monorepo root after Docker builds, or use a separate clean worktree at the same SHA.
Confirm the linked project and its `apps/web` root. The production web build uses the direct API
origin via `VITE_API_BASE_URL=https://api.corely.one` and `VITE_API_MODE=real`. Keep other build
variables from the existing project settings.

```bash
vercel link --yes --team "$vercel_scope" --project "$vercel_project"
web_deployment=$(vercel deploy --prod --skip-domain --yes --scope "$vercel_scope" \
  --build-env "VITE_API_BASE_URL=$api_origin" --build-env VITE_API_MODE=real \
  --meta "corelyReleaseCommit=$release_sha" --meta corelySurface=backoffice-existing-domain)
vercel inspect "$web_deployment" --scope "$vercel_scope"
```

For a local prebuilt release, use `vercel pull --yes --environment=production --scope "$vercel_scope"`
then `VITE_API_BASE_URL="$api_origin" VITE_API_MODE=real vercel build --prod --scope "$vercel_scope"`.
Upload with `vercel deploy --prebuilt --prod --skip-domain --yes --scope "$vercel_scope"` and the
same metadata. Build-time variables belong in the build step for prebuilt uploads. Keep pulled
configuration in the ignored `.vercel` directory of the release checkout. Confirm the candidate is
`READY`, matches the SHA and renders sign-in using the intended API origin. Use existing authorized
access for a protected candidate. [Vercel build](https://vercel.com/docs/cli/build) · [Vercel deploy](https://vercel.com/docs/cli/deploy)

## Switch traffic and verify

After both candidates pass and compatibility with the currently served web app is confirmed,
move API traffic first. Smoke-test the stable API origin before assigning the exact web alias.
`corely-web` also serves `pos.corely.one`. Use a hostname-specific alias assignment to keep the
release scoped to `app.corely.one`. [Vercel alias](https://vercel.com/docs/cli/alias)

```bash
gcloud run services update-traffic "$service" --project "$gcp_project" --region "$region" \
  --to-revisions "$candidate_revision=100"
curl -fsS -H "Origin: $web_origin" "$api_origin/health"

vercel alias set "$web_deployment" app.corely.one --scope "$vercel_scope"
vercel inspect "$web_origin" --scope "$vercel_scope"
curl -fsS -o /dev/null "$web_origin/auth/login"
```

Read back API traffic, the resolved image digest, and the Vercel alias. In a browser, verify sign-in
renders and that API requests use `https://api.corely.one` with CORS for `https://app.corely.one`.
Verify an authenticated database-backed read if an authorized account is available. Record the SHA,
image digest, revision, Vercel deployment ID, migration status, and any unverified checks in the
release ticket.

For a rollback, restore `app.corely.one` with `vercel alias set` and the recorded previous deployment.
Restore Cloud Run traffic with `gcloud run services update-traffic --to-revisions` and the previous
allocation once compatibility with the current database schema is verified. Check the restored
paths again. Application rollback leaves database migrations in place.
