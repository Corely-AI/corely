# Audit 05: Multi-Tenancy & Authorization

## 1. Tenancy "Foot-Guns" (Prisma)

Prisma does not enforce multi-tenancy by default. It relies on developer discipline.

**Critical Finding**: `PrismaCashRepository.updateRegister`

```typescript
async updateRegister(tenantId: string, id: string, data: ...) {
  // VIOLATION: tenantId ignored!
  const res = await this.prisma.cashRegister.update({
    where: { id }, // Vulnerable if ID is accessed across tenants
    data: ...
  });
}
```

**Fix**:

1. Check ownership first (`findFirstOrThrow({ where: { id, tenantId } })`).
2. Or use composite keys if DB supports it.
3. Or use RLS (Postgres Row Level Security) - recommended for high security.

## 2. Manual Tenant Checks (Boilerplate)

**Finding**: `accounting.usecases.ts`

```typescript
if (!ctx.tenantId) {
  return err(new ValidationError("tenantId is required"));
}
```

This check is repeated manually in hundreds of use cases.
**Risk**: One missed check = Data Leak / cross-tenant write.
**Fix**: Use a Guard/Decorator or Base Class (`AuthorizedUseCase`) that throws immediately if `tenantId` is missing in Context.

## 3. Data Leaks (Soft Checks)

**Finding**: `PrismaCashRepository.findDailyClose`

```typescript
const res = await this.prisma.cashDayClose.findUnique({ ... });
if (res && res.tenantId !== tenantId) return null; // "Soft" check
```

**Risk**: The data is loaded into memory before checking ownership. If the application crashes/logs the object before the check, data leaks into logs.
**Fix**: ALWAYS include `tenantId` in the database query `where` clause.

## 4. Authorization (RBAC)

**Observation**: `ctx.userId` is used, but specific Permission checks (`can(Action, Resource)`) are not visible in the `accounting` use cases audited.
**Gap**: Is RBAC enforced? If yes, where? If in Controller, that's weak (can be bypassed by Worker/CLI).
**Recommendation**: Enforce RBAC **inside** the Use Case or Domain Service.
