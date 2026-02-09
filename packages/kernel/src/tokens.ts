/**
 * Canonical DI tokens for kernel-level services.
 *
 * These tokens are used across API and worker services for dependency injection.
 * Use namespaced strings to avoid Symbol identity mismatches in monorepo setups.
 *
 * @see https://github.com/nestjs/nest/issues/2260
 */

// Core kernel services (provided by KernelModule in API)
export const ID_GENERATOR_TOKEN = "kernel/id-generator";
export const CLOCK_PORT_TOKEN = "kernel/clock-port";
export const IDEMPOTENCY_STORAGE_PORT_TOKEN = "api/idempotency-storage-port";

// Infrastructure ports (provided by DataModule)
export const AUDIT_PORT = "kernel/audit-port";
export const OUTBOX_PORT = "kernel/outbox-port";
export const IDEMPOTENCY_PORT = "kernel/idempotency-port";
export const UNIT_OF_WORK = "kernel/unit-of-work";

// Time services
export const TENANT_TIMEZONE_PORT = "api/tenant-timezone-port";

// Infrastructure
export const EMAIL_SENDER_PORT = "kernel/email-sender-port";
export const OBJECT_STORAGE_PORT = "kernel/object-storage-port";
