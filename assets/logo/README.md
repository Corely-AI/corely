# Corely Logo Variants

Generated assets for `assets/logo/corely-logo.png` are written to `assets/logo/generated`.

Current outputs include:

- Transparent logo marks in `64`, `128`, `256`, `512`, and `1024`
- Light-theme logo tiles in `64`, `128`, `256`, `512`, and `1024`
- Dark-theme logo tiles in `64`, `128`, `256`, `512`, and `1024`
- Monochrome transparent marks for dark and light surfaces
- Web favicons: `16x16`, `32x32`, `48x48`, and `favicon.ico`
- Web app icons: `apple-touch-icon`, `192x192`, and `512x512`
- Expo app icons for `apps/pos`

Regenerate everything with:

```powershell
./scripts/generate-logo-assets.ps1
```

The script also syncs the shared favicon and app icon files already used by:

- `apps/web/public`
- `apps/public-web/public`
- `apps/freelancer/public`
- `apps/crm/public`
- `apps/landing/assets/public`
- `apps/pos/assets`
