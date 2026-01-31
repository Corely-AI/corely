import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { RentalProperty, RentalStatus } from "@corely/contracts";
import { PropertyRepoPort } from "../../application/ports/property-repository.port";

@Injectable()
export class PrismaPropertyRepoAdapter implements PropertyRepoPort {
  constructor(private readonly prisma: PrismaService) {}

  private mapRow(row: any): RentalProperty {
    return {
      id: row.id,
      status: row.status,
      slug: row.slug,
      name: row.name,
      summary: row.summary,
      descriptionHtml: row.descriptionHtml,
      maxGuests: row.maxGuests,
      coverImageFileId: row.coverImageFileId,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      images: (row.images ?? []).map((img: any) => ({
        id: img.id,
        fileId: img.fileId,
        altText: img.altText,
        sortOrder: img.sortOrder,
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async findById(tenantId: string, id: string): Promise<RentalProperty | null> {
    const row = await this.prisma.rentalProperty.findFirst({
      where: { id, tenantId },
      include: {
        categories: { include: { category: true } },
        images: true,
      },
    });
    return row ? this.mapRow(row) : null;
  }

  async findBySlug(tenantId: string, slug: string): Promise<RentalProperty | null> {
    const row = await this.prisma.rentalProperty.findFirst({
      where: { slug, tenantId },
      include: {
        categories: { include: { category: true } },
        images: true,
      },
    });
    return row ? this.mapRow(row) : null;
  }

  async findBySlugPublic(slug: string): Promise<RentalProperty | null> {
    const row = await this.prisma.rentalProperty.findFirst({
      where: { slug, status: "PUBLISHED" },
      include: {
        categories: { include: { category: true } },
        images: true,
      },
    });
    return row ? this.mapRow(row) : null;
  }

  async list(
    tenantId: string,
    filters: { status?: RentalStatus; categoryId?: string; q?: string }
  ): Promise<RentalProperty[]> {
    const where: any = { tenantId };
    if (filters.status) {where.status = filters.status;}
    if (filters.categoryId) {
      where.categories = { some: { categoryId: filters.categoryId } };
    }
    if (filters.q) {
      where.OR = [
        { name: { contains: filters.q, mode: "insensitive" } },
        { slug: { contains: filters.q, mode: "insensitive" } },
      ];
    }

    const rows = await this.prisma.rentalProperty.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });
    return rows.map((row) => this.mapRow(row));
  }

  async listPublic(filters: { categorySlug?: string; q?: string }): Promise<RentalProperty[]> {
    const where: any = { status: "PUBLISHED" };
    if (filters.categorySlug) {
      where.categories = { some: { category: { slug: filters.categorySlug } } };
    }
    if (filters.q) {
      where.OR = [
        { name: { contains: filters.q, mode: "insensitive" } },
        { summary: { contains: filters.q, mode: "insensitive" } },
      ];
    }

    const rows = await this.prisma.rentalProperty.findMany({
      where,
      orderBy: { publishedAt: "desc" },
    });
    return rows.map((row) => this.mapRow(row));
  }

  async save(tenantId: string, workspaceId: string, property: any): Promise<RentalProperty> {
    const { id, categoryIds, ...data } = property;

    if (id) {
      const updated = await this.prisma.rentalProperty.update({
        where: { id },
        data: {
          ...data,
          categories: categoryIds
            ? {
                deleteMany: {},
                create: categoryIds.map((categoryId: string) => ({ categoryId })),
              }
            : undefined,
          images: property.images
            ? {
                deleteMany: {},
                create: property.images.map((img: any) => ({
                  tenantId,
                  workspaceId,
                  fileId: img.fileId,
                  altText: img.altText,
                  sortOrder: img.sortOrder ?? 0,
                })),
              }
            : undefined,
        },
      });
      return this.mapRow(updated);
    }

    const created = await this.prisma.rentalProperty.create({
      data: {
        ...data,
        tenantId,
        workspaceId,
        categories: categoryIds
          ? {
              create: categoryIds.map((categoryId: string) => ({ categoryId })),
            }
          : undefined,
        images: property.images
          ? {
              create: property.images.map((img: any) => ({
                tenantId,
                workspaceId,
                fileId: img.fileId,
                altText: img.altText,
                sortOrder: img.sortOrder ?? 0,
              })),
            }
          : undefined,
      },
    });
    return this.mapRow(created);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.prisma.rentalProperty.deleteMany({
      where: { id, tenantId },
    });
  }
}
