// Core module
export * from "./data.module";

// Prisma service and utilities
export * from "./prisma/prisma.service";
export * from "./uow/prisma-unit-of-work.adapter";

// Infrastructure adapters
export * from "./adapters/prisma-outbox.adapter";
export * from "./adapters/prisma-audit.adapter";
export * from "./adapters/prisma-idempotency.adapter";

// Repositories
export * from "./outbox/outbox.repo";
export * from "./repositories/customFieldDefinition.repo";
export * from "./repositories/customFieldIndex.repo";
export * from "./repositories/entityLayout.repo";

// Legacy exports (to be removed after migration)
export * from "./prisma.client";
