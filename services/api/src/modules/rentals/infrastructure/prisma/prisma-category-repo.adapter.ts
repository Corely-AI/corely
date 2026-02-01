import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { RentalCategory } from "@corely/contracts";
import { CategoryRepoPort } from "../../application/ports/category-repository.port";

@Injectable()
export class PrismaCategoryRepoAdapter implements CategoryRepoPort {
  constructor(private readonly prisma: PrismaService) {}

  private mapRow(row: any): RentalCategory {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
    };
  }

  async findById(tenantId: string, id: string): Promise<RentalCategory | null> {
    const row = await this.prisma.rentalCategory.findFirst({
      where: { id, tenantId },
    });
    return row ? this.mapRow(row) : null;
  }

  async findBySlug(tenantId: string, slug: string): Promise<RentalCategory | null> {
    const row = await this.prisma.rentalCategory.findFirst({
      where: { slug, tenantId },
    });
    return row ? this.mapRow(row) : null;
  }

  async list(tenantId: string): Promise<RentalCategory[]> {
    const rows = await this.prisma.rentalCategory.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
    return rows.map((row) => this.mapRow(row));
  }

  async save(tenantId: string, workspaceId: string, category: any): Promise<RentalCategory> {
    const { id, ...data } = category;
    if (id) {
      const updated = await this.prisma.rentalCategory.update({
        where: { id },
        data,
      });
      return this.mapRow(updated);
    }
    const created = await this.prisma.rentalCategory.create({
      data: {
        ...data,
        tenantId,
        workspaceId,
      },
    });
    return this.mapRow(created);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.prisma.rentalCategory.deleteMany({
      where: { id, tenantId },
    });
  }
}
