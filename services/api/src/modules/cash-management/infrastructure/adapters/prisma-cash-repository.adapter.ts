import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { CashRegister, CashEntry, CashDayClose, Prisma } from "@prisma/client";
import { CashRepositoryPort } from "../../application/ports/cash-repository.port";
import { CashRegisterEntity, CashEntryEntity, CashDayCloseEntity } from "../../domain/entities";
import { CreateCashRegister, CreateCashEntry } from "@corely/contracts";
import { CashEntryType, CashEntrySourceType, DailyCloseStatus } from "@corely/contracts";

@Injectable()
export class PrismaCashRepository implements CashRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  // --- Registers ---

  async createRegister(
    data: CreateCashRegister & { tenantId: string; workspaceId: string }
  ): Promise<CashRegisterEntity> {
    const res = await this.prisma.cashRegister.create({
      data: {
        tenantId: data.tenantId,
        workspaceId: data.workspaceId,
        name: data.name,
        currency: data.currency,
        location: data.location,
        currentBalanceCents: 0,
      },
    });
    return this.mapRegister(res);
  }

  async findById(tenantId: string, id: string): Promise<CashRegisterEntity | null> {
    const res = await this.prisma.cashRegister.findFirst({
      where: { id, tenantId },
    });
    return res ? this.mapRegister(res) : null;
  }

  async findAll(tenantId: string, workspaceId: string): Promise<CashRegisterEntity[]> {
    const res = await this.prisma.cashRegister.findMany({
      where: { tenantId, workspaceId },
      orderBy: { createdAt: "desc" },
    });
    return res.map((r) => this.mapRegister(r));
  }

  async updateRegister(
    tenantId: string,
    id: string,
    data: Partial<CashRegisterEntity>
  ): Promise<CashRegisterEntity> {
    // Security: Use updateMany to ensure tenantId matches atomically during update
    const { count } = await this.prisma.cashRegister.updateMany({
      where: { id, tenantId },
      data: {
        name: data.name,
        location: data.location,
        currentBalanceCents: data.currentBalanceCents,
      },
    });

    if (count === 0) {
      throw new Error(`CashRegister with ID ${id} not found in tenant ${tenantId}`);
    }

    const res = await this.prisma.cashRegister.findFirstOrThrow({
      where: { id, tenantId },
    });
    return this.mapRegister(res);
  }

  // --- Entries ---

  async createEntry(
    data: CreateCashEntry & { tenantId: string; workspaceId: string; createdByUserId: string }
  ): Promise<CashEntryEntity> {
    return await this.prisma.$transaction(async (tx) => {
      // Security: Verify register belongs to tenant
      const register = await tx.cashRegister.findFirst({
        where: { id: data.registerId, tenantId: data.tenantId },
        select: { id: true },
      });

      if (!register) {
        throw new Error(
          `CashRegister with ID ${data.registerId} not found in tenant ${data.tenantId}`
        );
      }

      // 1. Create Entry
      const entry = await tx.cashEntry.create({
        data: {
          tenantId: data.tenantId,
          workspaceId: data.workspaceId,
          registerId: data.registerId,
          type: data.type,
          amountCents: data.amountCents,
          sourceType: data.sourceType,
          description: data.description,
          referenceId: data.referenceId,
          businessDate: data.businessDate,
          createdByUserId: data.createdByUserId,
        },
      });

      // 2. Update Balance
      const balanceChange = data.type === CashEntryType.IN ? data.amountCents : -data.amountCents;

      await tx.cashRegister.update({
        where: { id: data.registerId },
        data: {
          currentBalanceCents: { increment: balanceChange },
        },
      });

      return this.mapEntry(entry);
    });
  }

  async findEntries(
    tenantId: string,
    registerId: string,
    filters?: { from?: string; to?: string }
  ): Promise<CashEntryEntity[]> {
    const where: Prisma.CashEntryWhereInput = { tenantId, registerId };
    if (filters?.from || filters?.to) {
      where.businessDate = {};
      if (filters.from) {
        where.businessDate.gte = filters.from;
      }
      if (filters.to) {
        where.businessDate.lte = filters.to;
      }
    }

    const res = await this.prisma.cashEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return res.map((e) => this.mapEntry(e));
  }

  async findEntryById(tenantId: string, id: string): Promise<CashEntryEntity | null> {
    const res = await this.prisma.cashEntry.findFirst({
      where: { id, tenantId },
    });
    return res ? this.mapEntry(res) : null;
  }

  // --- Daily Close ---

  async saveDailyClose(data: CashDayCloseEntity): Promise<CashDayCloseEntity> {
    // Security: Ensure register exists and belongs to tenant
    const register = await this.prisma.cashRegister.findFirst({
      where: { id: data.registerId, tenantId: data.tenantId },
      select: { id: true },
    });

    if (!register) {
      throw new Error(
        `CashRegister with ID ${data.registerId} not found in tenant ${data.tenantId}`
      );
    }

    const res = await this.prisma.cashDayClose.upsert({
      where: {
        registerId_businessDate: {
          registerId: data.registerId,
          businessDate: data.businessDate,
        },
      },
      update: {
        status: data.status,
        expectedBalanceCents: data.expectedBalanceCents,
        countedBalanceCents: data.countedBalanceCents,
        differenceCents: data.differenceCents,
        notes: data.notes,
        closedAt: data.closedAt,
        closedByUserId: data.closedByUserId,
      },
      create: {
        tenantId: data.tenantId,
        workspaceId: data.workspaceId,
        registerId: data.registerId,
        businessDate: data.businessDate,
        status: data.status,
        expectedBalanceCents: data.expectedBalanceCents,
        countedBalanceCents: data.countedBalanceCents,
        differenceCents: data.differenceCents,
        notes: data.notes,
        closedAt: data.closedAt,
        closedByUserId: data.closedByUserId,
      },
    });
    return this.mapDailyClose(res);
  }

  async findDailyClose(
    tenantId: string,
    registerId: string,
    businessDate: string
  ): Promise<CashDayCloseEntity | null> {
    const res = await this.prisma.cashDayClose.findUnique({
      where: {
        registerId_businessDate: { registerId, businessDate },
      },
    });
    if (res && res.tenantId !== tenantId) {
      return null;
    }
    return res ? this.mapDailyClose(res) : null;
  }

  async findDailyCloses(
    tenantId: string,
    registerId: string,
    from: string,
    to: string
  ): Promise<CashDayCloseEntity[]> {
    const res = await this.prisma.cashDayClose.findMany({
      where: {
        tenantId,
        registerId,
        businessDate: { gte: from, lte: to },
      },
      orderBy: { businessDate: "desc" },
    });
    return res.map((c) => this.mapDailyClose(c));
  }

  // --- Mappers ---

  private mapRegister(raw: CashRegister): CashRegisterEntity {
    return new CashRegisterEntity(
      raw.id,
      raw.tenantId,
      raw.workspaceId,
      raw.name,
      raw.currency,
      raw.currentBalanceCents,
      raw.location,
      raw.createdAt,
      raw.updatedAt
    );
  }

  private mapEntry(raw: CashEntry): CashEntryEntity {
    return new CashEntryEntity(
      raw.id,
      raw.tenantId,
      raw.workspaceId,
      raw.registerId,
      raw.type as CashEntryType,
      raw.amountCents,
      raw.sourceType as CashEntrySourceType,
      raw.description,
      raw.referenceId,
      raw.businessDate,
      raw.createdByUserId,
      raw.createdAt
    );
  }

  private mapDailyClose(raw: CashDayClose): CashDayCloseEntity {
    return new CashDayCloseEntity(
      raw.id,
      raw.tenantId,
      raw.workspaceId,
      raw.registerId,
      raw.businessDate,
      raw.status as DailyCloseStatus,
      raw.expectedBalanceCents,
      raw.countedBalanceCents,
      raw.differenceCents,
      raw.notes,
      raw.closedAt,
      raw.closedByUserId,
      raw.createdAt,
      raw.updatedAt
    );
  }
}
