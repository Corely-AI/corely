import { Injectable } from "@nestjs/common";
import { PrismaService, getPrismaClient } from "@corely/data";
import { type Prisma } from "@prisma/client";
import type { TransactionContext } from "@corely/kernel";
import type {
  AdminDirectoryRestaurantCreateInput,
  AdminDirectoryRestaurantUpdateInput,
  DirectoryLeadCreateInput,
  DirectoryRepositoryPort,
  LeadRestaurantRef,
} from "../application/ports/directory-repository.port";
import type {
  DirectoryLead,
  DirectoryOpeningHours,
  DirectoryRestaurant,
  DirectoryScope,
} from "../domain/directory.types";
import type {
  AdminDirectoryRestaurantListQuery,
  AdminDirectoryRestaurantSort,
  DirectoryRestaurantListQuery,
} from "@corely/contracts";

const toNumberOrNull = (value: Prisma.Decimal | number | null): number | null => {
  if (value === null) {
    return null;
  }
  if (typeof value === "number") {
    return value;
  }
  return value.toNumber();
};

const isOpeningHours = (value: unknown): value is DirectoryOpeningHours => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every(
    (slot) => Array.isArray(slot) && slot.every((item) => typeof item === "string")
  );
};

const toDirectoryRestaurant = (
  row: Prisma.DirectoryRestaurantGetPayload<Record<string, never>>
): DirectoryRestaurant => ({
  id: row.id,
  tenantId: row.tenantId,
  workspaceId: row.workspaceId,
  slug: row.slug,
  name: row.name,
  shortDescription: row.shortDescription,
  phone: row.phone,
  website: row.website,
  priceRange: row.priceRange,
  dishTags: row.dishTags,
  neighborhoodSlug: row.neighborhoodSlug,
  addressLine: row.addressLine,
  postalCode: row.postalCode,
  city: row.city,
  lat: toNumberOrNull(row.lat),
  lng: toNumberOrNull(row.lng),
  openingHoursJson: isOpeningHours(row.openingHoursJson) ? row.openingHoursJson : null,
  status: row.status,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const toDirectoryLead = (
  row: Prisma.DirectoryLeadGetPayload<Record<string, never>>
): DirectoryLead => ({
  id: row.id,
  tenantId: row.tenantId,
  workspaceId: row.workspaceId,
  restaurantId: row.restaurantId,
  name: row.name,
  contact: row.contact,
  message: row.message,
  status: row.status,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const resolveAdminOrderBy = (
  sort?: AdminDirectoryRestaurantSort
): Prisma.DirectoryRestaurantOrderByWithRelationInput[] => {
  switch (sort) {
    case "updatedAt:asc":
      return [{ updatedAt: "asc" }, { name: "asc" }];
    case "createdAt:desc":
      return [{ createdAt: "desc" }, { name: "asc" }];
    case "createdAt:asc":
      return [{ createdAt: "asc" }, { name: "asc" }];
    case "name:asc":
      return [{ name: "asc" }, { updatedAt: "desc" }];
    case "name:desc":
      return [{ name: "desc" }, { updatedAt: "desc" }];
    case "updatedAt:desc":
    default:
      return [{ updatedAt: "desc" }, { name: "asc" }];
  }
};

@Injectable()
export class PrismaDirectoryRepositoryAdapter implements DirectoryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listRestaurants(
    scope: DirectoryScope,
    query: DirectoryRestaurantListQuery
  ): Promise<{ items: DirectoryRestaurant[]; total: number }> {
    const where: Prisma.DirectoryRestaurantWhereInput = {
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
      status: "ACTIVE",
    };

    if (query.neighborhood) {
      where.neighborhoodSlug = query.neighborhood;
    }

    if (query.dish) {
      where.dishTags = { has: query.dish };
    }

    if (query.q) {
      where.OR = [
        {
          name: {
            contains: query.q,
            mode: "insensitive",
          },
        },
        {
          shortDescription: {
            contains: query.q,
            mode: "insensitive",
          },
        },
      ];
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.directoryRestaurant.findMany({
        where,
        orderBy: [{ name: "asc" }, { createdAt: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.directoryRestaurant.count({ where }),
    ]);

    return {
      items: rows.map(toDirectoryRestaurant),
      total,
    };
  }

  async listAdminRestaurants(
    scope: DirectoryScope,
    query: AdminDirectoryRestaurantListQuery
  ): Promise<{ items: DirectoryRestaurant[]; total: number }> {
    const where: Prisma.DirectoryRestaurantWhereInput = {
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.neighborhood) {
      where.neighborhoodSlug = query.neighborhood;
    }

    if (query.dish) {
      where.dishTags = { has: query.dish };
    }

    if (query.q) {
      where.OR = [
        {
          name: {
            contains: query.q,
            mode: "insensitive",
          },
        },
        {
          slug: {
            contains: query.q,
            mode: "insensitive",
          },
        },
        {
          shortDescription: {
            contains: query.q,
            mode: "insensitive",
          },
        },
      ];
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.directoryRestaurant.findMany({
        where,
        orderBy: resolveAdminOrderBy(query.sort),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.directoryRestaurant.count({ where }),
    ]);

    return {
      items: rows.map(toDirectoryRestaurant),
      total,
    };
  }

  async getRestaurantById(scope: DirectoryScope, id: string): Promise<DirectoryRestaurant | null> {
    const row = await this.prisma.directoryRestaurant.findFirst({
      where: {
        tenantId: scope.tenantId,
        workspaceId: scope.workspaceId,
        id,
      },
    });

    return row ? toDirectoryRestaurant(row) : null;
  }

  async findRestaurantBySlug(
    scope: DirectoryScope,
    slug: string,
    tx?: TransactionContext
  ): Promise<DirectoryRestaurant | null> {
    const client = getPrismaClient(this.prisma, tx);
    const row = await client.directoryRestaurant.findFirst({
      where: {
        tenantId: scope.tenantId,
        workspaceId: scope.workspaceId,
        slug,
      },
    });

    return row ? toDirectoryRestaurant(row) : null;
  }

  async getRestaurantBySlug(
    scope: DirectoryScope,
    slug: string
  ): Promise<DirectoryRestaurant | null> {
    const row = await this.prisma.directoryRestaurant.findFirst({
      where: {
        tenantId: scope.tenantId,
        workspaceId: scope.workspaceId,
        slug,
        status: "ACTIVE",
      },
    });

    return row ? toDirectoryRestaurant(row) : null;
  }

  async createRestaurant(
    input: AdminDirectoryRestaurantCreateInput,
    tx?: TransactionContext
  ): Promise<DirectoryRestaurant> {
    const client = getPrismaClient(this.prisma, tx);

    const row = await client.directoryRestaurant.create({
      data: {
        tenantId: input.scope.tenantId,
        workspaceId: input.scope.workspaceId,
        slug: input.slug,
        name: input.name,
        shortDescription: input.shortDescription,
        phone: input.phone,
        website: input.website,
        priceRange: input.priceRange,
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
    });

    return toDirectoryRestaurant(row);
  }

  async updateRestaurant(
    input: AdminDirectoryRestaurantUpdateInput,
    tx?: TransactionContext
  ): Promise<DirectoryRestaurant> {
    const client = getPrismaClient(this.prisma, tx);

    const row = await client.directoryRestaurant.update({
      where: {
        id: input.id,
      },
      data: {
        ...(input.patch.slug !== undefined ? { slug: input.patch.slug } : {}),
        ...(input.patch.name !== undefined ? { name: input.patch.name } : {}),
        ...(input.patch.shortDescription !== undefined
          ? { shortDescription: input.patch.shortDescription }
          : {}),
        ...(input.patch.phone !== undefined ? { phone: input.patch.phone } : {}),
        ...(input.patch.website !== undefined ? { website: input.patch.website } : {}),
        ...(input.patch.priceRange !== undefined ? { priceRange: input.patch.priceRange } : {}),
        ...(input.patch.dishTags !== undefined ? { dishTags: input.patch.dishTags } : {}),
        ...(input.patch.neighborhoodSlug !== undefined
          ? { neighborhoodSlug: input.patch.neighborhoodSlug }
          : {}),
        ...(input.patch.addressLine !== undefined ? { addressLine: input.patch.addressLine } : {}),
        ...(input.patch.postalCode !== undefined ? { postalCode: input.patch.postalCode } : {}),
        ...(input.patch.city !== undefined ? { city: input.patch.city } : {}),
        ...(input.patch.lat !== undefined ? { lat: input.patch.lat } : {}),
        ...(input.patch.lng !== undefined ? { lng: input.patch.lng } : {}),
        ...(input.patch.openingHoursJson !== undefined
          ? { openingHoursJson: input.patch.openingHoursJson }
          : {}),
        ...(input.patch.status !== undefined ? { status: input.patch.status } : {}),
      },
    });

    return toDirectoryRestaurant(row);
  }

  async findRestaurantForLead(
    scope: DirectoryScope,
    ref: LeadRestaurantRef,
    tx?: TransactionContext
  ): Promise<DirectoryRestaurant | null> {
    const client = getPrismaClient(this.prisma, tx);

    const row = await client.directoryRestaurant.findFirst({
      where: {
        tenantId: scope.tenantId,
        workspaceId: scope.workspaceId,
        status: "ACTIVE",
        ...(ref.restaurantId ? { id: ref.restaurantId } : {}),
        ...(ref.restaurantSlug ? { slug: ref.restaurantSlug } : {}),
      },
    });

    return row ? toDirectoryRestaurant(row) : null;
  }

  async createLead(
    input: DirectoryLeadCreateInput,
    tx?: TransactionContext
  ): Promise<DirectoryLead> {
    const client = getPrismaClient(this.prisma, tx);

    const row = await client.directoryLead.create({
      data: {
        tenantId: input.scope.tenantId,
        workspaceId: input.scope.workspaceId,
        restaurantId: input.restaurantId,
        name: input.name,
        contact: input.contact,
        message: input.message,
        status: "NEW",
      },
    });

    return toDirectoryLead(row);
  }
}
