// Canonical DI tokens for backend services (API + worker).
// Use namespaced strings to avoid Symbol identity mismatches.

export const AUDIT_PORT = "kernel/audit-port";
export const OUTBOX_PORT = "kernel/outbox-port";
export const IDEMPOTENCY_PORT = "kernel/idempotency-port";
export const UNIT_OF_WORK = "kernel/unit-of-work";

export const CLOCK_PORT_TOKEN = "kernel/clock-port";
export const ID_GENERATOR_TOKEN = "kernel/id-generator";

export const IDEMPOTENCY_STORAGE_PORT_TOKEN = "api/idempotency-storage-port";
export const TENANT_TIMEZONE_PORT = "api/tenant-timezone-port";
