import { describe, expect, it, vi } from "vitest";
import {
  InMemoryIdempotency,
  NoopLogger,
  type AuditPort,
  type OutboxPort,
  isErr,
} from "@corely/kernel";
import { ConsumeCustomerPackageUseCase } from "./consume-customer-package.usecase";
import type { PackageRepositoryPort } from "../ports/package-repository.port";

const buildPackageRepo = (): PackageRepositoryPort => {
  const customerPackage = {
    customerPackageId: "package-1",
    tenantId: "tenant-1",
    customerPartyId: "customer-1",
    name: "10 Session Pack",
    status: "ACTIVE" as const,
    totalUnits: 10,
    remainingUnits: 2,
    expiresOn: null,
    notes: null,
    createdByEmployeePartyId: null,
    createdAt: new Date("2026-02-01T00:00:00.000Z"),
    updatedAt: new Date("2026-02-01T00:00:00.000Z"),
  };

  return {
    createPackage: vi.fn(async () => undefined),
    findPackageById: vi.fn(async () => customerPackage),
    listPackages: vi.fn(async () => ({ items: [customerPackage], nextCursor: null })),
    consumePackageUnits: vi.fn(async () => null),
    listUsage: vi.fn(async () => ({ items: [], nextCursor: null })),
  };
};

describe("ConsumeCustomerPackageUseCase", () => {
  it("rejects consumption when units requested exceed remaining units", async () => {
    const packages = buildPackageRepo();
    const audit: AuditPort = { log: vi.fn(async () => undefined) };
    const outbox: OutboxPort = { enqueue: vi.fn(async () => undefined) };

    const useCase = new ConsumeCustomerPackageUseCase({
      logger: new NoopLogger(),
      packages,
      idempotency: new InMemoryIdempotency(),
      audit,
      outbox,
    });

    const result = await useCase.execute(
      {
        idempotencyKey: "idem-consume-1",
        usageId: "22222222-2222-4222-8222-222222222222",
        customerPackageId: "package-1",
        unitsUsed: 3,
        sourceType: null,
        sourceId: null,
        notes: null,
        createdByEmployeePartyId: null,
      },
      {
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        userId: "user-1",
      }
    );

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("Expected use case to fail");
    }

    expect(result.error.code).toBe("PACKAGE_INSUFFICIENT_UNITS");
    expect(packages.consumePackageUnits).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
    expect(outbox.enqueue).not.toHaveBeenCalled();
  });
});
