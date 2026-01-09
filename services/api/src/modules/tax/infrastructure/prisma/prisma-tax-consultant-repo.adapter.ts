import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { TaxConsultantRepoPort } from "../../domain/ports";
import type { TaxConsultantEntity } from "../../domain/entities";

@Injectable()
export class PrismaTaxConsultantRepoAdapter extends TaxConsultantRepoPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async get(tenantId: string): Promise<TaxConsultantEntity | null> {
    const row = await this.prisma.taxConsultant.findFirst({ where: { tenantId } });
    return row ? this.toDomain(row) : null;
  }

  async upsert(
    tenantId: string,
    input: Omit<TaxConsultantEntity, "id" | "tenantId" | "createdAt" | "updatedAt">
  ): Promise<TaxConsultantEntity> {
    const existing = await this.prisma.taxConsultant.findFirst({ where: { tenantId } });
    if (existing) {
      const updated = await this.prisma.taxConsultant.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          notes: input.notes,
        },
      });
      return this.toDomain(updated);
    }

    const created = await this.prisma.taxConsultant.create({
      data: {
        tenantId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        notes: input.notes,
      },
    });
    return this.toDomain(created);
  }

  private toDomain(model: any): TaxConsultantEntity {
    return {
      id: model.id,
      tenantId: model.tenantId,
      name: model.name,
      email: model.email,
      phone: model.phone,
      notes: model.notes,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }
}
