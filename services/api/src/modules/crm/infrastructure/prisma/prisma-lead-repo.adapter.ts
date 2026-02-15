import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { LeadAggregate, LeadStatus, LeadSource } from "../../domain/lead.aggregate";
import { LeadRepoPort, ListLeadsFilters } from "../../application/ports/lead-repository.port";

@Injectable()
export class PrismaLeadRepoAdapter implements LeadRepoPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, lead: LeadAggregate): Promise<void> {
    await (this.prisma as any).lead.create({
      data: {
        id: lead.id,
        tenantId,
        source: lead.source,
        status: lead.status,
        firstName: lead.firstName,
        lastName: lead.lastName,
        companyName: lead.companyName,
        email: lead.email,
        phone: lead.phone,
        ownerUserId: lead.ownerUserId,
        notes: lead.notes,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
        convertedDealId: lead.convertedDealId,
        convertedPartyId: lead.convertedPartyId,
      } as any,
    });
  }

  async update(tenantId: string, lead: LeadAggregate): Promise<void> {
    await (this.prisma as any).lead.update({
      where: { id: lead.id },
      data: {
        status: lead.status,
        ownerUserId: lead.ownerUserId,
        updatedAt: lead.updatedAt,
        convertedDealId: lead.convertedDealId,
        convertedPartyId: lead.convertedPartyId,
      } as any,
    });
  }

  async findById(tenantId: string, id: string): Promise<LeadAggregate | null> {
    const row = await (this.prisma as any).lead.findFirst({
      where: { id, tenantId },
    });
    if (!row) return null;
    return this.toAggregate(row);
  }

  async list(tenantId: string, filters?: ListLeadsFilters): Promise<LeadAggregate[]> {
    const where: any = { tenantId };
    if (filters?.status) {
      where.status = filters.status;
    }
    const rows = await (this.prisma as any).lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r: any) => this.toAggregate(r));
  }

  private toAggregate(row: any): LeadAggregate {
    return new LeadAggregate({
      id: row.id,
      tenantId: row.tenantId,
      source: row.source as LeadSource,
      status: row.status as LeadStatus,
      firstName: row.firstName,
      lastName: row.lastName,
      companyName: row.companyName,
      email: row.email,
      phone: row.phone,
      ownerUserId: row.ownerUserId,
      convertedDealId: row.convertedDealId,
      convertedPartyId: row.convertedPartyId,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
