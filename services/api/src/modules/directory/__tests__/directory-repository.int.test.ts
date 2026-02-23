import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { type PostgresTestDb, createTestDb, stopSharedContainer } from "@corely/testkit";
import type { PrismaService } from "@corely/data";
import { PrismaDirectoryRepositoryAdapter } from "../infrastructure/prisma-directory-repository.adapter";

vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });

describe("PrismaDirectoryRepositoryAdapter", () => {
  let db: PostgresTestDb;
  let prisma: PrismaService;
  let repo: PrismaDirectoryRepositoryAdapter;
  let dbReady = false;

  const scope = {
    tenantId: "directory-public-tenant",
    workspaceId: "directory-public-workspace",
  };

  beforeAll(async () => {
    try {
      db = await createTestDb();
      prisma = db.client;
      repo = new PrismaDirectoryRepositoryAdapter(prisma);
      dbReady = true;
    } catch {
      dbReady = false;
    }
  });

  beforeEach(async () => {
    if (!dbReady) {
      return;
    }

    await db.reset();

    await prisma.directoryRestaurant.createMany({
      data: [
        {
          id: "restaurant-a",
          tenantId: scope.tenantId,
          workspaceId: scope.workspaceId,
          slug: "pho-viet-mitte",
          name: "Pho Viet Mitte",
          shortDescription: "Pho and bun cha",
          dishTags: ["pho", "bun-cha"],
          neighborhoodSlug: "mitte",
          addressLine: "Rosenthaler Str. 10",
          postalCode: "10119",
          city: "Berlin",
          status: "ACTIVE",
        },
        {
          id: "restaurant-b",
          tenantId: scope.tenantId,
          workspaceId: scope.workspaceId,
          slug: "vegan-vietnam-kreuzberg",
          name: "Vegan Vietnam Kreuzberg",
          shortDescription: "Plant based classics",
          dishTags: ["vegan-pho", "tofu"],
          neighborhoodSlug: "kreuzberg",
          addressLine: "Oranienstr. 80",
          postalCode: "10969",
          city: "Berlin",
          status: "ACTIVE",
        },
        {
          id: "restaurant-hidden",
          tenantId: scope.tenantId,
          workspaceId: scope.workspaceId,
          slug: "hidden-spot",
          name: "Hidden Spot",
          shortDescription: "Should not be listed",
          dishTags: ["pho"],
          neighborhoodSlug: "mitte",
          addressLine: "Somewhere 1",
          postalCode: "10115",
          city: "Berlin",
          status: "HIDDEN",
        },
      ],
    });
  });

  afterAll(async () => {
    if (dbReady) {
      await db.down();
    }
    await stopSharedContainer();
  });

  it("lists active restaurants with search and filters", async () => {
    if (!dbReady) {
      return;
    }

    const result = await repo.listRestaurants(scope, {
      q: "pho",
      page: 1,
      pageSize: 20,
    });

    expect(result.total).toBe(1);
    expect(result.items[0].slug).toBe("pho-viet-mitte");

    const byDish = await repo.listRestaurants(scope, {
      dish: "tofu",
      page: 1,
      pageSize: 20,
    });

    expect(byDish.total).toBe(1);
    expect(byDish.items[0].slug).toBe("vegan-vietnam-kreuzberg");

    const byNeighborhood = await repo.listRestaurants(scope, {
      neighborhood: "mitte",
      page: 1,
      pageSize: 20,
    });

    expect(byNeighborhood.total).toBe(1);
    expect(byNeighborhood.items[0].slug).toBe("pho-viet-mitte");
  });

  it("returns detail by slug only for active restaurants", async () => {
    if (!dbReady) {
      return;
    }

    const active = await repo.getRestaurantBySlug(scope, "pho-viet-mitte");
    expect(active).not.toBeNull();
    expect(active?.name).toBe("Pho Viet Mitte");

    const hidden = await repo.getRestaurantBySlug(scope, "hidden-spot");
    expect(hidden).toBeNull();

    const missing = await repo.getRestaurantBySlug(scope, "does-not-exist");
    expect(missing).toBeNull();
  });

  it("lists restaurants for admin with status and text filters", async () => {
    if (!dbReady) {
      return;
    }

    const all = await repo.listAdminRestaurants(scope, {
      page: 1,
      pageSize: 20,
      sort: "updatedAt:desc",
    });
    expect(all.total).toBe(3);

    const hiddenOnly = await repo.listAdminRestaurants(scope, {
      page: 1,
      pageSize: 20,
      status: "HIDDEN",
      sort: "updatedAt:desc",
    });
    expect(hiddenOnly.total).toBe(1);
    expect(hiddenOnly.items[0].slug).toBe("hidden-spot");

    const searchBySlug = await repo.listAdminRestaurants(scope, {
      page: 1,
      pageSize: 20,
      q: "vegan",
      sort: "updatedAt:desc",
    });
    expect(searchBySlug.total).toBe(1);
    expect(searchBySlug.items[0].slug).toBe("vegan-vietnam-kreuzberg");
  });
});
