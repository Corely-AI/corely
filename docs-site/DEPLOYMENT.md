# Deploying Corely Docs (Mintlify)

This runbook configures docs hosting for `docs.corely.one` from this monorepo.

## 1) Configure Mintlify project path

1. Open the Mintlify Dashboard.
2. Go to project **Git Settings**.
3. Enable **Monorepo**.
4. Set docs path to `/docs-site`.

## 2) Enable GitHub auto-deployments

1. Install the Mintlify GitHub App on the Corely repository.
2. Confirm the Mintlify project is connected to the correct branch.
3. Verify push-based preview/production deployments are active.

## 3) Add the custom domain

1. In Mintlify Dashboard, open **Domains**.
2. Add custom domain: `docs.corely.one`.

## 4) Configure DNS

Create this DNS record in your DNS provider:

- Type: `CNAME`
- Name/Host: `docs`
- Target/Value: `cname.mintlify-dns.com.`

## 5) Validate TLS and proxy settings

1. Wait for DNS propagation and TLS provisioning in Mintlify.
2. If using Cloudflare, keep DNS as **DNS only** during initial verification to avoid SSL/proxy interference.
3. After certificate issuance, re-enable proxy mode if needed and re-check docs availability.
