import { Injectable } from "@nestjs/common";
import { PrismaService, PrismaExtKvAdapter, getPrismaClient } from "@corely/data";
import {
  OpenBukStudioSchema,
  OpenBukSetupDraftSchema,
  type OpenBukSetupDraft,
  type OpenBukSetup,
  type OpenBukStudio,
  type OpenBukBook,
  type OpenBukReceipt,
} from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";

import { randomUUID } from "node:crypto";
import type {
  OpenBukRepositoryPort,
  StudioScope,
  BookingReceiptRecord,
} from "../../application/ports/openbuk-repository.port";
import { studioDate } from "../../domain/openbuk-availability";

const settingsKey = (scope: StudioScope, key = "openbuk-studio") => ({
  tenantId: scope.tenantId,
  moduleId: "booking",
  scope: `workspace:${scope.workspaceId}`,
  key,
});

@Injectable()
export class PrismaOpenBukRepositoryAdapter implements OpenBukRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kv: PrismaExtKvAdapter
  ) {}

  async lock(scope: StudioScope, key: string, tx: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    // Shared with all Booking allocation writers. ReadCommitted takes a fresh
    // snapshot after waiting, so the losing writer sees the winner's allocation.
    await client.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${scope.tenantId}:${key}`}, 0))::text`;
  }

  async draft(scope: StudioScope, tx?: TransactionContext) {
    const record = await this.kv.get(settingsKey(scope, "openbuk-setup-draft"), tx);
    return record ? OpenBukSetupDraftSchema.parse(record.value) : null;
  }
  async saveDraft(scope: StudioScope, input: OpenBukSetupDraft, tx: TransactionContext) {
    await this.kv.set({ ...settingsKey(scope, "openbuk-setup-draft"), value: input }, tx);
  }

  async isRegistered(scope: StudioScope): Promise<boolean> {
    return (await this.kv.get(settingsKey(scope))) !== null;
  }

  async studio(scope: StudioScope, tx?: TransactionContext): Promise<OpenBukStudio | null> {
    const client = getPrismaClient(this.prisma, tx);
    const record = await this.kv.get(settingsKey(scope), tx);
    if (!record) {
      return null;
    }
    const config = OpenBukStudioSchema.parse(record.value);
    const [service, staff, rule] = await Promise.all([
      client.bookingServiceOffering.findFirst({
        where: { ...scope, id: config.serviceId, isActive: true },
      }),
      client.bookingResource.findFirst({
        where: { ...scope, id: config.staffId, type: "STAFF", isActive: true },
      }),
      client.bookingAvailabilityRule.findUnique({
        where: { tenantId_resourceId: { tenantId: scope.tenantId, resourceId: config.staffId } },
      }),
    ]);
    if (!service || !staff || !rule) {
      return null;
    }
    // Fail closed if another product changes this offering to require deposits or
    // additional resources. This initial checkout does not collect payments.
    if (
      service.depositCents ||
      service.requiredResourceTypes.some((r) => r !== "STAFF") ||
      service.requiredTags.some((tag) => !staff.tags.includes(tag))
    ) {
      return null;
    }
    return OpenBukStudioSchema.parse({
      ...config,
      serviceName: service.name,
      staffName: staff.name,
      durationMinutes: service.durationMinutes,
      priceCents: service.priceCents,
      currency: service.currency,
      bufferBeforeMinutes: service.bufferBeforeMinutes,
      bufferAfterMinutes: service.bufferAfterMinutes,
      timezone: rule.timezone,
      weeklyHours: rule.weeklySlots,
      blockedTimes: rule.blackouts,
      effectiveFrom: rule.effectiveFrom?.toISOString() ?? null,
      effectiveTo: rule.effectiveTo?.toISOString() ?? null,
    });
  }

  async configure(scope: StudioScope, input: OpenBukSetup, slug: string, tx: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    const old = await this.kv.get(settingsKey(scope), tx);
    const existing = old ? OpenBukStudioSchema.parse(old.value) : null;
    const serviceId = existing?.serviceId ?? randomUUID();
    const staffId = existing?.staffId ?? randomUUID();
    await this.lock(scope, staffId, tx);
    const service = {
      name: input.serviceName,
      durationMinutes: input.durationMinutes,
      priceCents: input.priceCents,
      currency: input.currency,
      bufferBeforeMinutes: input.bufferBeforeMinutes,
      bufferAfterMinutes: input.bufferAfterMinutes,
    };
    await client.bookingServiceOffering.upsert({
      where: { id: serviceId, ...scope },
      create: {
        id: serviceId,
        ...scope,
        ...service,
        requiredResourceTypes: ["STAFF"],
        requiredTags: [],
      },
      update: service,
    });
    await client.bookingResource.upsert({
      where: { id: staffId, ...scope },
      create: {
        id: staffId,
        ...scope,
        name: input.staffName,
        type: "STAFF",
        capacity: 1,
        tags: [],
      },
      update: { name: input.staffName },
    });
    await client.bookingAvailabilityRule.upsert({
      where: { tenantId_resourceId: { tenantId: scope.tenantId, resourceId: staffId } },
      create: {
        tenantId: scope.tenantId,
        resourceId: staffId,
        timezone: input.timezone,
        weeklySlots: input.weeklyHours,
        blackouts: input.blockedTimes,
      },
      update: {
        timezone: input.timezone,
        weeklySlots: input.weeklyHours,
        blackouts: input.blockedTimes,
      },
    });
    const studio = { ...input, slug, serviceId, staffId };
    await this.kv.set({ ...settingsKey(scope), value: studio }, tx);
    return studio;
  }

  async occupied(
    scope: StudioScope,
    staffId: string,
    from: Date,
    to: Date,
    now: Date,
    tx?: TransactionContext
  ) {
    const client = getPrismaClient(this.prisma, tx);
    const [allocations, holds] = await Promise.all([
      client.bookingAllocation.findMany({
        where: {
          tenantId: scope.tenantId,
          resourceId: staffId,
          startAt: { lt: to },
          endAt: { gt: from },
          booking: { status: { in: ["HOLD", "CONFIRMED"] } },
        },
        select: { startAt: true, endAt: true },
      }),
      client.bookingHold.findMany({
        where: {
          tenantId: scope.tenantId,
          resourceIds: { has: staffId },
          status: "ACTIVE",
          expiresAt: { gt: now },
          startAt: { lt: to },
          endAt: { gt: from },
        },
        select: { startAt: true, endAt: true },
      }),
    ]);
    return [...allocations, ...holds];
  }

  async receipt(scope: StudioScope, key: string, tx: TransactionContext) {
    const row = await getPrismaClient(this.prisma, tx).idempotencyKey.findUnique({
      where: {
        tenantId_actionKey_key: {
          tenantId: scope.tenantId,
          actionKey: `openbuk.book:${scope.workspaceId}`,
          key,
        },
      },
    });
    return row?.responseJson ? (JSON.parse(row.responseJson) as BookingReceiptRecord) : null;
  }

  async saveReceipt(
    scope: StudioScope,
    key: string,
    record: BookingReceiptRecord,
    tx: TransactionContext
  ) {
    await getPrismaClient(this.prisma, tx).idempotencyKey.create({
      data: {
        tenantId: scope.tenantId,
        actionKey: `openbuk.book:${scope.workspaceId}`,
        key,
        status: "COMPLETED",
        responseStatus: 201,
        responseJson: JSON.stringify(record),
      },
    });
  }

  async create(
    scope: StudioScope,
    studio: OpenBukStudio,
    input: OpenBukBook,
    receipt: OpenBukReceipt,
    tx: TransactionContext
  ) {
    const id = randomUUID();
    await getPrismaClient(this.prisma, tx).booking.create({
      data: {
        id,
        ...scope,
        status: "CONFIRMED",
        startAt: receipt.startAt,
        endAt: receipt.endAt,
        referenceNumber: receipt.reference,
        serviceOfferingId: studio.serviceId,
        bookedByName: input.customer.name,
        bookedByEmail: input.customer.email,
        allocations: {
          create: {
            tenantId: scope.tenantId,
            resourceId: studio.staffId,
            role: "PRIMARY",
            startAt: new Date(Date.parse(receipt.startAt) - studio.bufferBeforeMinutes * 60000),
            endAt: new Date(Date.parse(receipt.endAt) + studio.bufferAfterMinutes * 60000),
          },
        },
      },
    });
    return id;
  }

  async appointments(scope: StudioScope, day: string) {
    const studio = await this.studio(scope);
    if (!studio) {
      return [];
    }
    const midnight = Date.parse(`${day}T00:00:00Z`);
    const rows = await this.prisma.booking.findMany({
      where: {
        ...scope,
        startAt: { gte: new Date(midnight - 14 * 3600000), lt: new Date(midnight + 38 * 3600000) },
      },
      include: { serviceOffering: true, allocations: { include: { resource: true } } },
      orderBy: { startAt: "asc" },
    });
    return rows
      .filter((row) => studioDate(row.startAt, studio.timezone) === day)
      .map((row) => ({
        id: row.id,
        reference: row.referenceNumber ?? row.id,
        status: row.status,
        customerName: row.bookedByName ?? "",
        startAt: row.startAt.toISOString(),
        endAt: row.endAt.toISOString(),
        serviceName: row.serviceOffering?.name ?? "",
        staffName: row.allocations[0]?.resource.name ?? "",
        priceCents: row.serviceOffering?.priceCents ?? 0,
        currency: row.serviceOffering?.currency ?? studio.currency,
        timezone: studio.timezone,
      }));
  }
}
