import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { AccountAggregate, type AccountProfileProps, type PartySnapshot } from "../../domain/account.aggregate";
import type { AccountRepositoryPort, AccountFilters } from "../../application/ports/account-repository.port";
import type { AccountStatus, CrmAccountType } from "@corely/contracts";

@Injectable()
export class PrismaAccountRepoAdapter implements AccountRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async createProfile(profile: AccountProfileProps): Promise<void> {
    await this.prisma.crmAccountProfile.create({
      data: {
        id: profile.id,
        tenantId: profile.tenantId,
        partyId: profile.partyId,
        accountType: profile.accountType,
        status: profile.status,
        industry: profile.industry,
        ownerUserId: profile.ownerUserId,
        notes: profile.notes,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    });
  }

  async updateProfile(profile: AccountProfileProps): Promise<void> {
    await this.prisma.crmAccountProfile.update({
      where: { id: profile.id },
      data: {
        accountType: profile.accountType,
        status: profile.status,
        industry: profile.industry,
        ownerUserId: profile.ownerUserId,
        notes: profile.notes,
        updatedAt: profile.updatedAt,
      },
    });
  }

  async findById(tenantId: string, id: string): Promise<AccountAggregate | null> {
    const record = await this.prisma.crmAccountProfile.findFirst({
      where: { id, tenantId },
      include: {
        party: {
          include: {
            contactPoints: { where: { isPrimary: true } },
          },
        },
      },
    });

    if (!record) return null;
    return this.toAggregate(record);
  }

  async findByPartyId(tenantId: string, partyId: string): Promise<AccountAggregate | null> {
    const record = await this.prisma.crmAccountProfile.findFirst({
      where: { tenantId, partyId },
      include: {
        party: {
          include: {
            contactPoints: { where: { isPrimary: true } },
          },
        },
      },
    });

    if (!record) return null;
    return this.toAggregate(record);
  }

  async list(
    tenantId: string,
    filters: AccountFilters,
    pagination: { page: number; pageSize: number; sortBy?: string; sortOrder?: "asc" | "desc" }
  ): Promise<{ items: AccountAggregate[]; total: number }> {
    // Build where clause combining CRM profile + Party filters
    const profileWhere: Record<string, unknown> = { tenantId };
    if (filters.status) profileWhere.status = filters.status;
    if (filters.accountType) profileWhere.accountType = filters.accountType;
    if (filters.ownerUserId) profileWhere.ownerUserId = filters.ownerUserId;

    // Search query filters on Party.displayName
    if (filters.q) {
      profileWhere.party = {
        OR: [
          { displayName: { contains: filters.q, mode: "insensitive" } },
          { contactPoints: { some: { value: { contains: filters.q, mode: "insensitive" } } } },
        ],
      };
    }

    // Determine sort field
    let orderBy: Record<string, unknown>;
    if (pagination.sortBy === "name") {
      orderBy = { party: { displayName: pagination.sortOrder ?? "asc" } };
    } else {
      const sortField = pagination.sortBy ?? "createdAt";
      orderBy = { [sortField]: pagination.sortOrder ?? "desc" };
    }

    const [records, total] = await Promise.all([
      this.prisma.crmAccountProfile.findMany({
        where: profileWhere,
        include: {
          party: {
            include: {
              contactPoints: { where: { isPrimary: true } },
            },
          },
        },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
        orderBy,
      }),
      this.prisma.crmAccountProfile.count({ where: profileWhere }),
    ]);

    const items = records.map((r) => this.toAggregate(r));
    return { items, total };
  }

  // ─── Private helpers ──────────────────────────
  private toAggregate(record: {
    id: string;
    tenantId: string;
    partyId: string;
    accountType: string;
    status: string;
    industry: string | null;
    ownerUserId: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    party: {
      id: string;
      tenantId: string;
      displayName: string;
      website: string | null;
      industry: string | null;
      contactPoints: Array<{ type: string; value: string; isPrimary: boolean }>;
    };
  }): AccountAggregate {
    const primaryEmail = record.party.contactPoints.find((cp) => cp.type === "EMAIL")?.value ?? null;
    const primaryPhone = record.party.contactPoints.find((cp) => cp.type === "PHONE")?.value ?? null;

    const partySnapshot: PartySnapshot = {
      id: record.party.id,
      tenantId: record.party.tenantId,
      displayName: record.party.displayName,
      website: record.party.website,
      industry: record.party.industry,
      primaryEmail,
      primaryPhone,
    };

    const profile: AccountProfileProps = {
      id: record.id,
      tenantId: record.tenantId,
      partyId: record.partyId,
      accountType: record.accountType as CrmAccountType,
      status: record.status as AccountStatus,
      industry: record.industry ?? undefined,
      ownerUserId: record.ownerUserId ?? undefined,
      notes: record.notes ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };

    return AccountAggregate.compose(partySnapshot, profile);
  }
}
