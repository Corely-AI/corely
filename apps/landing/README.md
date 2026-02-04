# Corely Landing App

A marketing landing app for Corely, built with Vite + React + TypeScript and aligned with the monorepo architecture.

## Local development

```bash
pnpm --filter @corely/landing dev
```

## Build

```bash
pnpm --filter @corely/landing build
```

## Vercel routing note

This app is a SPA (Vite + React Router). The `apps/landing/vercel.json` file rewrites all routes to `index.html` so deep-link refreshes (e.g., `/pricing`) do not 404 on Vercel.

## SEO and FAQ updates

- Per-route metadata lives in the `Seo` component usage inside each page module.
- Update the site URL default in `apps/landing/src/shared/lib/site.ts` or set `VITE_SITE_URL`.
- FAQ copy and JSON-LD live in `apps/landing/src/modules/home/screens/HomePage.tsx`.
- Update static SEO files in `apps/landing/assets/public/robots.txt`, `apps/landing/assets/public/sitemap.xml`, and `apps/landing/assets/public/rss.xml` when routes or the primary domain change.
