# Vercel Queues for Corely workflows

[Issue #447](https://github.com/Corely-AI/corely/issues/447) · [Deployment guide ticket #438](https://github.com/Corely-AI/corely/issues/438)

This opt-in driver binds the existing workflow orchestrator and task runner to Vercel Queues in poll mode. It uses the NestJS Vercel Function directly and preserves the existing Cloud Tasks and in-memory configurations. Vercel OIDC authenticates requests from the API to the queue. A scheduled API call polls both topics. The PostgreSQL outbox continues to run on its own schedule.

## Set up a test deployment

Run from the checkout root. Link the dedicated test API project and verify its project and team IDs before setting its production-scope variables. Prod here means the stable URL of the test project. Enable Vercel OIDC for the project. Choose an available Vercel Queues region near the API. Use a separate namespace and project for each live environment.

```bash
vercel link --yes --non-interactive --project "$API_PROJECT" --team "$VERCEL_SCOPE" --token "$VERCEL_TOKEN"
jq -e --arg project "$API_PROJECT_ID" --arg org "$VERCEL_TEAM_ID" \
  '.projectId == $project and .orgId == $org' .vercel/project.json

printf '%s' vercel | vercel env add WORKFLOW_QUEUE_DRIVER production --force --yes --token "$VERCEL_TOKEN"
printf '%s' "$VERCEL_WORKFLOW_QUEUE_REGION" | vercel env add VERCEL_WORKFLOW_QUEUE_REGION production --force --yes --token "$VERCEL_TOKEN"
printf '%s' "$VERCEL_WORKFLOW_QUEUE_NAMESPACE" | vercel env add VERCEL_WORKFLOW_QUEUE_NAMESPACE production --force --yes --token "$VERCEL_TOKEN"
printf '%s' "$WORKER_API_SERVICE_TOKEN" | vercel env add WORKER_API_SERVICE_TOKEN production --force --yes --token "$VERCEL_TOKEN"
vercel deploy --prod --yes --non-interactive --token "$VERCEL_TOKEN"
```

In the dedicated Supabase project, repeat the Cron setup from #438 with schedule name `corely-workflow-queues`, Vault URL entry `corely_workflow_poll_url`, endpoint `/internal/queues/vercel/poll` and SQL request body `'{}'::jsonb`. Reuse the same service-token Vault value. The request sends `x-service-token` and polls at most one delivery per topic. The SDK shares topics across deployment revisions and isolates them by namespace and region. Topics end in `-workflow-orchestrator` and `-workflow-task-runner`. Keep the function invocation below 240 seconds and disable the smoke-test schedule when finished.

## Verify

1. With polling disabled, start a harmless workflow and verify that the orchestrator topic has a pending message. Record its message and instance IDs.
2. Redeploy the same API project using the same namespace and region. Resume polling. Confirm both queue topics deliver work to the stable API and the workflow completes.
3. Exercise one transient failure and confirm that the same job is retried and that the final step has one observable durable effect. Inspect the queue delivery attempts and Corely's workflow history.

Vercel delivery is at least once. Task handlers that perform external effects must provide downstream idempotency for the crash window between the effect and recording success. Vercel Queues retains messages for up to 24 hours. Keep timer delays within the provider's supported window. [Poll mode](https://vercel.com/docs/queues/poll-mode)

## Verification limits

The hosted redeploy, retry and observable-effect checks require an authenticated Vercel and Supabase test deployment. This ticket changes no UI surface.
