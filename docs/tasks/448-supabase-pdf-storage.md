# Supabase Storage for Corely invoice PDFs

[Issue #448](https://github.com/Corely-AI/corely/issues/448) · [Deployment guide ticket #438](https://github.com/Corely-AI/corely/issues/438)

Generated invoice PDFs can use a private Supabase bucket through the Supabase S3 endpoint. New invoice file records save the existing `s3` provider value and the configured bucket. The worker and authenticated download read from the provider recorded on each file. Existing GCS records continue using GCS. Other documents use their existing configuration.

## Set up a test deployment

Use the private `corely-invoice-pdfs` bucket from #438. In the intended Supabase project, enable S3 access and create server-side S3 credentials. Use the S3 endpoint and region displayed in Storage settings. Keep the credentials in the deployment secret store and use dedicated test credentials. [Supabase S3 authentication](https://supabase.com/docs/guides/storage/s3/authentication)

From the checkout root, link the test API project and verify its team and project IDs. The stable test URL uses Vercel's production scope.

```bash
vercel link --yes --non-interactive --project "$API_PROJECT" --team "$VERCEL_SCOPE" --token "$VERCEL_TOKEN"
jq -e --arg project "$API_PROJECT_ID" --arg org "$VERCEL_TEAM_ID" \
  '.projectId == $project and .orgId == $org' .vercel/project.json

set_pdf_env() {
  printf '%s' "$2" | vercel env add "$1" production --yes --force --non-interactive --token "$VERCEL_TOKEN"
}
set_pdf_env INVOICE_PDF_STORAGE_PROVIDER supabase
set_pdf_env SUPABASE_STORAGE_S3_ENDPOINT "$SUPABASE_STORAGE_S3_ENDPOINT"
set_pdf_env SUPABASE_STORAGE_S3_REGION "$SUPABASE_STORAGE_S3_REGION"
set_pdf_env SUPABASE_STORAGE_S3_ACCESS_KEY_ID "$SUPABASE_STORAGE_S3_ACCESS_KEY_ID"
set_pdf_env SUPABASE_STORAGE_S3_SECRET_ACCESS_KEY "$SUPABASE_STORAGE_S3_SECRET_ACCESS_KEY"
set_pdf_env SUPABASE_STORAGE_INVOICE_BUCKET corely-invoice-pdfs
vercel deploy --prod --yes --non-interactive --token "$VERCEL_TOKEN"
```

## Verify

1. Create a test invoice and request a PDF through the authenticated Corely invoice UI or API. Verify the worker creates one private bucket object. Open the authorized download and compare the invoice identifier.
2. Retry the same outbox job or request regeneration. Check that the same object key is used. Exercise an authenticated download from a second workspace and confirm access is denied.
3. Check Vercel's Chromium launch and rendering logs. The storage adapter uses the existing renderer. Renderer packaging and hosted execution require a Vercel smoke test.

This ticket changes no UI surface. Hosted rendering and download checks require an authenticated test deployment.
