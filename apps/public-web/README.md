# Corely Public Web

Public-facing web app for portfolios, rentals, blog, and CMS pages.

## Local development

```bash
pnpm --filter @corely/public-web dev
```

## Build

```bash
pnpm --filter @corely/public-web build
```

## Vercel routing note

This app is Next.js (App Router), so it handles deep links server-side. A SPA-style rewrite is not needed; if you see 404s on refresh, check the Vercel project Root Directory (`apps/public-web`) and Next.js build settings instead.
