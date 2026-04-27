import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { Prisma } from "@prisma/client";
import type { ListPosTransactionsInput, PosSaleLineItem, PosSalePayment } from "@corely/contracts";
import { PosSaleRecord } from "../../domain/pos-sale-record.entity";
import type {
  ListPosSaleRecordsResult,
  PosSaleRepositoryPort,
} from "../../application/ports/pos-sale-repository.port";

const toUtcStartOfDay = (value: string): Date => new Date(`${value}T00:00:00.000Z`);
const toUtcEndOfDay = (value: string): Date => new Date(`${value}T23:59:59.999Z`);
const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

@Injectable()
export class PrismaPosSaleRepositoryAdapter implements PosSaleRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(record: PosSaleRecord): Promise<void> {
    await this.prisma.posSaleRecord.upsert({
      where: { id: record.id },
      update: {
        sessionId: record.sessionId,
        registerId: record.registerId,
        receiptNumber: record.receiptNumber,
        saleDate: record.saleDate,
        cashierEmployeePartyId: record.cashierEmployeePartyId,
        customerPartyId: record.customerPartyId,
        subtotalCents: record.subtotalCents,
        taxCents: record.taxCents,
        totalCents: record.totalCents,
        currency: record.currency,
        status: record.status,
        lineItemsJson: record.lineItems as unknown as Prisma.InputJsonValue,
        paymentsJson: record.payments as unknown as Prisma.InputJsonValue,
        idempotencyKey: record.idempotencyKey,
        serverInvoiceId: record.serverInvoiceId,
        serverPaymentId: record.serverPaymentId,
        syncedAt: record.syncedAt,
      },
      create: {
        id: record.id,
        workspaceId: record.workspaceId,
        sessionId: record.sessionId,
        registerId: record.registerId,
        receiptNumber: record.receiptNumber,
        saleDate: record.saleDate,
        cashierEmployeePartyId: record.cashierEmployeePartyId,
        customerPartyId: record.customerPartyId,
        subtotalCents: record.subtotalCents,
        taxCents: record.taxCents,
        totalCents: record.totalCents,
        currency: record.currency,
        status: record.status,
        lineItemsJson: record.lineItems as unknown as Prisma.InputJsonValue,
        paymentsJson: record.payments as unknown as Prisma.InputJsonValue,
        idempotencyKey: record.idempotencyKey,
        serverInvoiceId: record.serverInvoiceId,
        serverPaymentId: record.serverPaymentId,
        syncedAt: record.syncedAt,
      },
    });
  }

  async list(
    workspaceId: string,
    input: ListPosTransactionsInput
  ): Promise<ListPosSaleRecordsResult> {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 50;
    const skip = (page - 1) * pageSize;

    const searchTerm = input.q?.trim();
    const qLooksLikeUuid = searchTerm ? isUuid(searchTerm) : false;

    const where: Prisma.PosSaleRecordWhereInput = {
      workspaceId,
      ...(input.registerId ? { registerId: input.registerId } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.fromDate || input.toDate
        ? {
            saleDate: {
              ...(input.fromDate ? { gte: toUtcStartOfDay(input.fromDate) } : {}),
              ...(input.toDate ? { lte: toUtcEndOfDay(input.toDate) } : {}),
            },
          }
        : {}),
      ...(searchTerm
        ? {
            OR: [
              ...(qLooksLikeUuid
                ? [
                    { id: searchTerm },
                    { serverInvoiceId: searchTerm },
                    { serverPaymentId: searchTerm },
                  ]
                : []),
              { receiptNumber: { contains: searchTerm, mode: "insensitive" } },
              { idempotencyKey: { contains: searchTerm, mode: "insensitive" } },
              { register: { name: { contains: searchTerm, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [records, total] = await Promise.all([
      this.prisma.posSaleRecord.findMany({
        where,
        include: {
          register: true,
        },
        orderBy: {
          saleDate: "desc",
        },
        skip,
        take: pageSize,
      }),
      this.prisma.posSaleRecord.count({ where }),
    ]);

    return {
      items: records.map((record) => this.toDomain(record)),
      total,
    };
  }

  async findById(workspaceId: string, transactionId: string): Promise<PosSaleRecord | null> {
    const record = await this.prisma.posSaleRecord.findFirst({
      where: {
        id: transactionId,
        workspaceId,
      },
      include: {
        register: true,
      },
    });

    return record ? this.toDomain(record) : null;
  }

  private toDomain(
    record: Prisma.PosSaleRecordGetPayload<{
      include: { register: true };
    }>
  ): PosSaleRecord {
    return new PosSaleRecord(
      record.id,
      record.workspaceId,
      record.sessionId,
      record.registerId,
      record.register?.name ?? null,
      record.receiptNumber,
      record.saleDate,
      record.cashierEmployeePartyId,
      record.customerPartyId,
      record.subtotalCents,
      record.taxCents,
      record.totalCents,
      record.currency,
      "SYNCED",
      record.lineItemsJson as unknown as PosSaleLineItem[],
      record.paymentsJson as unknown as PosSalePayment[],
      record.idempotencyKey,
      record.serverInvoiceId,
      record.serverPaymentId,
      record.syncedAt,
      record.createdAt,
      record.updatedAt
    );
  }
}
