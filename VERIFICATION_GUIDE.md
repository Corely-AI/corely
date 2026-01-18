# EE Refactoring Verification Guide

## Quick Verification Steps

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Build EE Packages

```bash
pnpm --filter './ee/**' build
```

### 3. Build OSS Edition

```bash
pnpm run build:oss
```

### 4. Build EE Edition

```bash
pnpm run build:ee
```

### 5. Run Tests

```bash
# OSS tests
EDITION=oss pnpm test:unit

# EE tests (requires EE packages installed)
EDITION=ee pnpm test:unit
```

### 6. Verify OSS Builds Without EE

```bash
pnpm run ci:verify-oss-no-ee
```

## What to Check

### ✅ Workspace Structure

```
ee/
├── api-ee/          # Backend EE package
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
├── web-ee/          # Frontend EE package
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
└── shared-ee/       # Shared EE utilities
    ├── package.json
    ├── tsconfig.json
    └── src/
```

### ✅ Bridge Loaders Exist

- `services/api/src/ee-loader.ts`
- `apps/web/src/ee-loader.ts`

### ✅ No Static EE Imports

Run ESLint to verify:

```bash
pnpm lint
```

Should NOT find any imports like:

- `import { X } from '@corely/api-ee'` (except in ee-loader.ts)
- `import { X } from '@corely/web-ee'` (except in ee-loader.ts)
- `import { X } from '../../../ee/...'`

### ✅ Old Structure Removed

```bash
ls ee/services
# Should output: No such file or directory
```

### ✅ TenancyModule Uses Bridge

Check `services/api/src/shared/tenancy/tenancy.module.ts`:

```typescript
import { loadEeTenancy } from "../../ee-loader"; // ✅ Correct

// NOT this:
// import('../../../ee/services/api/tenancy/index.js')  // ❌ Old way
```

## Common Issues & Fixes

### Issue: "Cannot find module '@corely/api-ee'"

**Fix:**

```bash
# Install dependencies
pnpm install

# Build EE packages
pnpm --filter '@corely/api-ee' build
```

### Issue: ESLint error "EE packages must be loaded via runtime edition bridges"

**Fix:** Move the import to the bridge loader file:

- Backend: `services/api/src/ee-loader.ts`
- Frontend: `apps/web/src/ee-loader.ts`

### Issue: OSS build fails with EE import errors

**Fix:** Ensure you're using dynamic imports:

```typescript
// ❌ Wrong (static import)
import { MultiTenantResolver } from "@corely/api-ee";

// ✅ Correct (dynamic import via bridge)
import { loadEeTenancy } from "./ee-loader";
const { MultiTenantResolver } = await loadEeTenancy();
```

## Success Criteria

All of these should pass:

- [ ] `pnpm install` completes without errors
- [ ] `pnpm --filter './ee/**' build` builds all EE packages
- [ ] `pnpm run build:oss` builds without EE packages
- [ ] `pnpm run build:ee` builds with all packages
- [ ] `pnpm lint` passes without boundary violations
- [ ] `pnpm test:unit` passes for both editions
- [ ] `pnpm run ci:verify-oss-no-ee` verifies OSS independence
- [ ] No `ee/services` directory exists
- [ ] Bridge loaders are the only files importing from EE packages

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    OSS (Always Present)                  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ TenancyModule.forEdition(edition)                │  │
│  │   if (edition === 'ee'):                         │  │
│  │     await loadEeTenancy() ──┐                    │  │
│  │   else:                      │                    │  │
│  │     SingleTenantResolver     │                    │  │
│  └──────────────────────────────┼───────────────────┘  │
│                                 │                       │
│  ┌──────────────────────────────▼───────────────────┐  │
│  │ ee-loader.ts (Bridge)                            │  │
│  │   Dynamic import('@corely/api-ee')               │  │
│  └──────────────────────────────┬───────────────────┘  │
└─────────────────────────────────┼──────────────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │    EE (Optional)           │
                    │                            │
                    │  @corely/api-ee            │
                    │  - MultiTenantResolver     │
                    │  - RoutingService          │
                    │                            │
                    │  @corely/web-ee            │
                    │  - WorkspaceSwitcher       │
                    └────────────────────────────┘
```

## Next Steps After Verification

Once verification passes:

1. **Commit the changes**

   ```bash
   git add .
   git commit -m "refactor: separate EE into workspace packages with hard boundaries"
   ```

2. **Update CI/CD**
   - Ensure `.github/workflows/verify-oss.yml` runs on PRs
   - Add separate build jobs for OSS and EE in your existing CI

3. **Document for team**
   - Share `REFACTOR_SUMMARY.md` with the team
   - Update onboarding docs to explain edition gating

4. **Plan EE features**
   - See "Next Steps" in `REFACTOR_SUMMARY.md`
   - Add tenant provisioning API
   - Add tenant admin UI

---

**Need Help?** Check `REFACTOR_SUMMARY.md` for detailed architecture info.
