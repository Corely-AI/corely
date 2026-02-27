import { describe, expect, it } from "vitest";
import {
  isErr,
  isOk,
  type AuditPort,
  type TransactionContext,
  type UnitOfWorkPort,
} from "@corely/kernel";
import { type CreateAdminDirectoryRestaurantRequest } from "@corely/contracts";
import { AdminCreateRestaurantCommandUseCase } from "../application/use-cases/admin-create-restaurant-command.usecase";
import type { DirectoryRepositoryPort } from "../application/ports/directory-repository.port";
import type { DirectoryLead, DirectoryRestaurant, DirectoryScope } from "../domain/directory.types";

type StoredIdempotencyResult = {
  status: "COMPLETED" | "FAILED" | "IN_PROGRESS";
  responseStatus?: number;
  responseBody?: unknown;
  requestHash?: string | null;
};

class FakeIdempotencyService {
  private readonly records = new Map<string, StoredIdempotencyResult>();

  async startOrReplay(params: {
    actionKey: string;
    tenantId: string | null;
    userId?: string | null;
    idempotencyKey: string;
    requestHash?: string | null;
  }) {
    const key = `${params.tenantId ?? "null"}:${params.actionKey}:${params.idempotencyKey}`;
    const existing = this.records.get(key);

    if (!existing) {
      this.records.set(key, {
        status: "IN_PROGRESS",
        requestHash: params.requestHash,
      });
      return { mode: "STARTED" as const };
    }

    if (existing.requestHash && params.requestHash && existing.requestHash !== params.requestHash) {
      return { mode: "MISMATCH" as const };
    }

    if (existing.status === "COMPLETED") {
      return {
        mode: "REPLAY" as const,
        responseStatus: existing.responseStatus ?? 200,
        responseBody: existing.responseBody,
      };
    }

    if (existing.status === "FAILED") {
      return {
        mode: "FAILED" as const,
        responseStatus: existing.responseStatus ?? 500,
        responseBody: existing.responseBody,
      };
    }

    return { mode: "IN_PROGRESS" as const, retryAfterMs: 1000 };
  }

  async complete(params: {
    actionKey: string;
    tenantId: string | null;
    idempotencyKey: string;
    responseStatus: number;
    responseBody: unknown;
  }) {
    const key = `${params.tenantId ?? "null"}:${params.actionKey}:${params.idempotencyKey}`;
    const existing = this.records.get(key);
    this.records.set(key, {
      status: "COMPLETED",
      responseStatus: params.responseStatus,
      responseBody: params.responseBody,
      requestHash: existing?.requestHash,
    });
  }

  async fail(params: {
    actionKey: string;
    tenantId: string | null;
    idempotencyKey: string;
    responseStatus?: number;
    responseBody?: unknown;
  }) {
    const key = `${params.tenantId ?? "null"}:${params.actionKey}:${params.idempotencyKey}`;
    this.records.set(key, {
      status: "FAILED",
      responseStatus: params.responseStatus,
      responseBody: params.responseBody,
    });
  }
}

const baseScope: DirectoryScope = {
  tenantId: "directory-public-tenant",
  workspaceId: "directory-public-workspace",
};

const toRestaurant = (
  input: CreateAdminDirectoryRestaurantRequest,
  id: string,
  scope: DirectoryScope
): DirectoryRestaurant => ({
  id,
  tenantId: scope.tenantId,
  workspaceId: scope.workspaceId,
  slug: input.slug,
  name: input.name,
  shortDescription: input.shortDescription ?? null,
  phone: input.phone ?? null,
  website: input.website ?? null,
  priceRange: input.priceRange ?? null,
  dishTags: input.dishTags,
  neighborhoodSlug: input.neighborhoodSlug ?? null,
  addressLine: input.addressLine,
  postalCode: input.postalCode,
  city: input.city,
  lat: input.lat ?? null,
  lng: input.lng ?? null,
  openingHoursJson: input.openingHoursJson ?? null,
  status: input.status,
  createdAt: new Date("2026-02-22T10:00:00.000Z"),
  updatedAt: new Date("2026-02-22T10:00:00.000Z"),
});

const createRepository = () => {
  const restaurants: DirectoryRestaurant[] = [];

  const repo: DirectoryRepositoryPort = {
    listRestaurants: async () => ({ items: [], total: 0 }),
    listAdminRestaurants: async () => ({ items: restaurants, total: restaurants.length }),
    getRestaurantById: async (_scope, id) => restaurants.find((item) => item.id === id) ?? null,
    findRestaurantBySlug: async (_scope, slug) =>
      restaurants.find((item) => item.slug === slug) ?? null,
    getRestaurantBySlug: async (_scope, slug) =>
      restaurants.find((item) => item.slug === slug && item.status === "ACTIVE") ?? null,
    findRestaurantForLead: async () => null,
    createRestaurant: async (input) => {
      const restaurant = toRestaurant(
        {
          slug: input.slug,
          name: input.name,
          shortDescription: input.shortDescription,
          phone: input.phone,
          website: input.website,
          priceRange: input.priceRange as "$" | "$$" | "$$$" | "$$$$" | null,
          dishTags: input.dishTags,
          neighborhoodSlug: input.neighborhoodSlug,
          addressLine: input.addressLine,
          postalCode: input.postalCode,
          city: input.city,
          lat: input.lat,
          lng: input.lng,
          openingHoursJson: input.openingHoursJson,
          status: input.status,
        },
        `restaurant-${restaurants.length + 1}`,
        input.scope
      );
      restaurants.push(restaurant);
      return restaurant;
    },
    updateRestaurant: async () => {
      throw new Error("Not implemented");
    },
    createLead: async () => {
      throw new Error("Not implemented");
    },
  };

  return { repo, restaurants };
};

describe("AdminCreateRestaurantCommandUseCase", () => {
  it("is idempotent for duplicate Idempotency-Key", async () => {
    const { repo, restaurants } = createRepository();
    const idempotency = new FakeIdempotencyService();
    const auditEntries: Array<{ action: string; entityId: string }> = [];

    const uow: UnitOfWorkPort = {
      withinTransaction: async <T>(fn: (tx: TransactionContext) => Promise<T>) =>
        fn({} as TransactionContext),
    };

    const audit: AuditPort = {
      log: async (entry) => {
        auditEntries.push({ action: entry.action, entityId: entry.entityId });
      },
    };

    const useCase = new AdminCreateRestaurantCommandUseCase(repo, uow, idempotency, audit);

    const input: CreateAdminDirectoryRestaurantRequest = {
      name: "Pho Bar Neukolln",
      slug: "pho-bar-neukoelln",
      status: "HIDDEN",
      addressLine: "Sonnenallee 105",
      postalCode: "12045",
      city: "Berlin",
      dishTags: ["pho", "banh-mi"],
    };

    const first = await useCase.execute(
      { input, idempotencyKey: "idem-directory-admin-1" },
      {
        ...baseScope,
        userId: "user-1",
        correlationId: "corr-1",
        requestId: "req-1",
      }
    );

    const second = await useCase.execute(
      { input, idempotencyKey: "idem-directory-admin-1" },
      {
        ...baseScope,
        userId: "user-1",
        correlationId: "corr-2",
        requestId: "req-2",
      }
    );

    expect(isOk(first)).toBe(true);
    expect(isOk(second)).toBe(true);

    if (isOk(first) && isOk(second)) {
      expect(first.value.restaurant.id).toBe(second.value.restaurant.id);
    }

    expect(restaurants).toHaveLength(1);
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0].action).toBe("directory.restaurant.created");
  });

  it("returns slug conflict when creating duplicate slug", async () => {
    const { repo } = createRepository();
    const idempotency = new FakeIdempotencyService();

    const uow: UnitOfWorkPort = {
      withinTransaction: async <T>(fn: (tx: TransactionContext) => Promise<T>) =>
        fn({} as TransactionContext),
    };

    const audit: AuditPort = {
      log: async () => undefined,
    };

    const useCase = new AdminCreateRestaurantCommandUseCase(repo, uow, idempotency, audit);

    const input: CreateAdminDirectoryRestaurantRequest = {
      name: "Pho Bar Neukolln",
      slug: "pho-bar-neukoelln",
      status: "HIDDEN",
      addressLine: "Sonnenallee 105",
      postalCode: "12045",
      city: "Berlin",
      dishTags: ["pho"],
    };

    await useCase.execute(
      { input, idempotencyKey: "idem-directory-admin-2a" },
      {
        ...baseScope,
        userId: "user-1",
        correlationId: "corr-1",
        requestId: "req-1",
      }
    );

    const second = await useCase.execute(
      {
        input: {
          ...input,
          name: "Another Name",
        },
        idempotencyKey: "idem-directory-admin-2b",
      },
      {
        ...baseScope,
        userId: "user-1",
        correlationId: "corr-2",
        requestId: "req-2",
      }
    );

    expect(isErr(second)).toBe(true);
    if (isErr(second)) {
      expect(second.error.code).toBe("Directory:SlugAlreadyExists");
    }
  });
});
