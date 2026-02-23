import { describe, expect, it } from "vitest";
import {
  isErr,
  isOk,
  type OutboxPort,
  type TransactionContext,
  type UnitOfWorkPort,
} from "@corely/kernel";
import {
  DIRECTORY_EVENT_TYPES,
  type CreateDirectoryLeadRequest,
  type CreateDirectoryLeadResponse,
} from "@corely/contracts";
import { CreateLeadCommandUseCase } from "../application/use-cases/create-lead-command.usecase";
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

const fixedRestaurant = (scope: DirectoryScope): DirectoryRestaurant => ({
  id: "restaurant-1",
  tenantId: scope.tenantId,
  workspaceId: scope.workspaceId,
  slug: "pho-viet-mitte",
  name: "Pho Viet Mitte",
  shortDescription: null,
  phone: null,
  website: null,
  priceRange: "$$",
  dishTags: ["pho"],
  neighborhoodSlug: "mitte",
  addressLine: "Rosenthaler Str. 10",
  postalCode: "10119",
  city: "Berlin",
  lat: null,
  lng: null,
  openingHoursJson: null,
  status: "ACTIVE",
  createdAt: new Date("2026-02-21T12:00:00.000Z"),
  updatedAt: new Date("2026-02-21T12:00:00.000Z"),
});

const scopePlaceholder: DirectoryScope = {
  tenantId: "directory-public-tenant",
  workspaceId: "directory-public-workspace",
};

const createRepository = () => {
  const leads: DirectoryLead[] = [];

  const repo: DirectoryRepositoryPort = {
    listRestaurants: async () => ({ items: [], total: 0 }),
    listAdminRestaurants: async () => ({ items: [], total: 0 }),
    getRestaurantById: async () => null,
    findRestaurantBySlug: async () => null,
    getRestaurantBySlug: async () => null,
    findRestaurantForLead: async (scope) => fixedRestaurant(scope),
    createRestaurant: async () => fixedRestaurant(scopePlaceholder),
    updateRestaurant: async () => fixedRestaurant(scopePlaceholder),
    createLead: async (input) => {
      const lead: DirectoryLead = {
        id: `lead-${leads.length + 1}`,
        tenantId: input.scope.tenantId,
        workspaceId: input.scope.workspaceId,
        restaurantId: input.restaurantId,
        name: input.name,
        contact: input.contact,
        message: input.message,
        status: "NEW",
        createdAt: new Date("2026-02-22T10:00:00.000Z"),
        updatedAt: new Date("2026-02-22T10:00:00.000Z"),
      };
      leads.push(lead);
      return lead;
    },
  };

  return { repo, leads };
};

describe("CreateLeadCommandUseCase", () => {
  it("is idempotent for duplicate Idempotency-Key", async () => {
    const { repo, leads } = createRepository();
    const idempotency = new FakeIdempotencyService();
    const outboxEvents: Array<{ eventType: string; payload: unknown }> = [];

    const outbox: OutboxPort = {
      enqueue: async (event) => {
        outboxEvents.push({ eventType: event.eventType, payload: event.payload });
      },
    };

    const uow: UnitOfWorkPort = {
      withinTransaction: async <T>(fn: (tx: TransactionContext) => Promise<T>) =>
        fn({} as TransactionContext),
    };

    const useCase = new CreateLeadCommandUseCase(repo, outbox, uow, idempotency);

    const input: CreateDirectoryLeadRequest = {
      restaurantSlug: "pho-viet-mitte",
      name: "Ana",
      contact: "ana@example.com",
      message: "Need catering for 20 people",
    };

    const first = await useCase.execute(
      { input, idempotencyKey: "idem-lead-1" },
      {
        tenantId: "directory-public-tenant",
        workspaceId: "directory-public-workspace",
        correlationId: "corr-1",
        requestId: "req-1",
      }
    );

    const second = await useCase.execute(
      { input, idempotencyKey: "idem-lead-1" },
      {
        tenantId: "directory-public-tenant",
        workspaceId: "directory-public-workspace",
        correlationId: "corr-2",
        requestId: "req-2",
      }
    );

    expect(isOk(first)).toBe(true);
    expect(isOk(second)).toBe(true);

    if (isOk(first) && isOk(second)) {
      expect((first.value as CreateDirectoryLeadResponse).leadId).toBe(
        (second.value as CreateDirectoryLeadResponse).leadId
      );
    }

    expect(leads).toHaveLength(1);
    expect(outboxEvents).toHaveLength(1);
    expect(outboxEvents[0].eventType).toBe(DIRECTORY_EVENT_TYPES.LEAD_CREATED);
  });

  it("rejects reused idempotency key with different payload", async () => {
    const { repo } = createRepository();
    const idempotency = new FakeIdempotencyService();

    const outbox: OutboxPort = {
      enqueue: async () => undefined,
    };

    const uow: UnitOfWorkPort = {
      withinTransaction: async <T>(fn: (tx: TransactionContext) => Promise<T>) =>
        fn({} as TransactionContext),
    };

    const useCase = new CreateLeadCommandUseCase(repo, outbox, uow, idempotency);

    const ctx = {
      tenantId: "directory-public-tenant",
      workspaceId: "directory-public-workspace",
      correlationId: "corr-1",
      requestId: "req-1",
    };

    await useCase.execute(
      {
        input: {
          restaurantSlug: "pho-viet-mitte",
          name: "Ana",
          contact: "ana@example.com",
          message: "Need catering for 20 people",
        },
        idempotencyKey: "idem-lead-2",
      },
      ctx
    );

    const second = await useCase.execute(
      {
        input: {
          restaurantSlug: "pho-viet-mitte",
          name: "Ana",
          contact: "ana@example.com",
          message: "Need catering for 40 people",
        },
        idempotencyKey: "idem-lead-2",
      },
      ctx
    );

    expect(isErr(second)).toBe(true);
    if (isErr(second)) {
      expect(second.error.code).toBe("Directory:IdempotencyKeyReusedWithDifferentPayload");
    }
  });
});
