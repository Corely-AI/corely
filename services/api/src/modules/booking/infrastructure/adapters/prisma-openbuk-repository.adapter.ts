import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService, PrismaExtKvAdapter, getPrismaClient } from "@corely/data";
import {
  OpenBukReceiptSchema,
  OpenBukStudioSchema,
  OpenBukSetupDraftSchema,
  type OpenBukSetupDraft,
  type OpenBukSetup,
  type OpenBukStudio,
  type OpenBukBook,
  type OpenBukReceipt,
  type OpenBukPublicService,
  type OpenBukTeamUpdate,
} from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";

import { randomUUID } from "node:crypto";
import type {
  OpenBukRepositoryPort,
  StudioScope,
  BookingReceiptRecord,
  OpenBukSelection,
  OpenBukTeamConfiguration,
} from "../../application/ports/openbuk-repository.port";
import { studioDate } from "../../domain/openbuk-availability";
import { findTeamCommitments, writeTeamRecords } from "./openbuk-team-records";

const extensionScope = (scope: StudioScope) => ({
  tenantId: scope.tenantId,
  moduleId: "booking",
  scope: `workspace:${scope.workspaceId}`,
});
const settingsKey = (scope: StudioScope, key = "openbuk-studio") => ({
  ...extensionScope(scope),
  key,
});
const snapshotKey = (scope: StudioScope, bookingId: string) =>
  settingsKey(scope, `openbuk-appointment:${bookingId}`);

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

  private async roster(scope: StudioScope, tx?: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    const [record, saved] = await Promise.all([
      this.kv.get(settingsKey(scope), tx),
      this.kv.get(settingsKey(scope, "openbuk-team"), tx),
    ]);
    if (!record) {
      return null;
    }
    const config = OpenBukStudioSchema.parse(record.value);
    const team = (saved?.value as OpenBukTeamConfiguration | undefined) ?? null;
    const staffIds = team?.staffIds ?? [config.staffId];
    const services = team?.services ?? [{ id: config.serviceId, staffIds }];
    const [serviceRows, staffRows] = await Promise.all([
      client.bookingServiceOffering.findMany({
        where: { ...scope, id: { in: services.map((service) => service.id) } },
      }),
      client.bookingResource.findMany({
        where: { ...scope, id: { in: staffIds }, type: "STAFF" },
        include: { availabilityRule: { where: { tenantId: scope.tenantId } } },
      }),
    ]);
    return {
      config,
      team,
      staffIds,
      services,
      serviceRows: new Map(serviceRows.map((row) => [row.id, row])),
      staffRows: new Map(staffRows.map((row) => [row.id, row])),
    };
  }

  private selection(
    roster: NonNullable<Awaited<ReturnType<PrismaOpenBukRepositoryAdapter["roster"]>>>,
    { serviceId, staffId }: OpenBukSelection,
    admin = false
  ) {
    const service = roster.serviceRows.get(serviceId);
    const staff = roster.staffRows.get(staffId);
    const rule = staff?.availabilityRule[0];
    if (!service || !staff || !rule) {
      return null;
    }
    if (
      !admin &&
      (!service.isActive ||
        !staff.isActive ||
        service.depositCents ||
        service.requiredResourceTypes.some((type) => type !== "STAFF") ||
        service.requiredTags.some((tag) => !staff.tags.includes(tag)) ||
        !roster.services.find((item) => item.id === serviceId)?.staffIds.includes(staffId))
    ) {
      return null;
    }
    const parsed = OpenBukStudioSchema.safeParse({
      ...roster.config,
      serviceId,
      staffId,
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
    return parsed.success ? parsed.data : null;
  }

  async studio(scope: StudioScope, tx?: TransactionContext, selection?: OpenBukSelection) {
    const roster = await this.roster(scope, tx);
    if (!roster) {
      return null;
    }
    if (selection) {
      return this.selection(roster, selection);
    }
    return this.catalog(roster)?.studio ?? null;
  }

  async studioSettings(scope: StudioScope) {
    const roster = await this.roster(scope);
    return roster ? (this.selection(roster, roster.config, true) ?? roster.config) : null;
  }

  async publicCatalog(scope: StudioScope) {
    const roster = await this.roster(scope);
    return roster ? this.catalog(roster) : null;
  }

  private catalog(
    roster: NonNullable<Awaited<ReturnType<PrismaOpenBukRepositoryAdapter["roster"]>>>
  ) {
    let studio: OpenBukStudio | undefined;
    const services: OpenBukPublicService[] = [];
    for (const { id: serviceId, staffIds } of roster.services) {
      const matches = staffIds
        .map((staffId) => this.selection(roster, { serviceId, staffId }))
        .filter((match) => match !== null);
      const first = matches[0];
      if (!first) {
        continue;
      }
      studio ??= first;
      const {
        serviceName,
        durationMinutes,
        priceCents,
        currency,
        bufferBeforeMinutes,
        bufferAfterMinutes,
      } = first;
      services.push({
        serviceId,
        serviceName,
        durationMinutes,
        priceCents,
        currency,
        bufferBeforeMinutes,
        bufferAfterMinutes,
        staff: matches.map(({ staffId, staffName, timezone }) => ({
          staffId,
          staffName,
          timezone,
        })),
      });
    }
    return studio ? { studio, services: roster.team ? services : undefined } : null;
  }

  async team(scope: StudioScope, now: Date, tx?: TransactionContext) {
    const roster = await this.roster(scope, tx);
    if (!roster) {
      return null;
    }
    const commitments = await findTeamCommitments(
      getPrismaClient(this.prisma, tx),
      scope,
      now,
      [...roster.serviceRows.keys()],
      [...roster.staffRows.keys()]
    );
    return {
      revision: roster.team?.revision ?? null,
      currency: roster.config.currency,
      primaryServiceId: roster.config.serviceId,
      primaryStaffId: roster.config.staffId,
      staff: roster.staffIds.flatMap((id) => {
        const row = roster.staffRows.get(id);
        return row
          ? [
              {
                id,
                staffName: row.name,
                active: row.isActive,
                futureCommitments: commitments.filter(({ allocations }) =>
                  allocations.some((item) => item.resourceId === id)
                ).length,
              },
            ]
          : [];
      }),
      services: roster.services.flatMap(({ id, staffIds }) => {
        const row = roster.serviceRows.get(id);
        return row
          ? [
              {
                id,
                staffIds: staffIds.filter((staffId) => roster.staffRows.has(staffId)),
                serviceName: row.name,
                durationMinutes: row.durationMinutes,
                priceCents: row.priceCents ?? 0,
                bufferBeforeMinutes: row.bufferBeforeMinutes,
                bufferAfterMinutes: row.bufferAfterMinutes,
                active: row.isActive,
                futureCommitments: commitments.filter((booking) => booking.serviceOfferingId === id)
                  .length,
              },
            ]
          : [];
      }),
    };
  }

  async saveTeam(
    scope: StudioScope,
    input: OpenBukTeamUpdate,
    fingerprint: string,
    now: Date,
    tx: TransactionContext
  ) {
    const roster = await this.roster(scope, tx);
    if (!roster) {
      throw new NotFoundException("Publish the studio first");
    }
    const savedTeam = async (changed: boolean) => {
      const team = await this.team(scope, now, tx);
      if (!team) {
        throw new NotFoundException("Studio is no longer configured");
      }
      return { team, changed };
    };
    if (roster.team?.revision === input.updateId) {
      if (roster.team.fingerprint !== fingerprint) {
        throw new ConflictException("Booking:IdempotencyMismatch");
      }
      return savedTeam(false);
    }
    if ((roster.team?.revision ?? null) !== input.revision) {
      throw new ConflictException("Booking:TeamChanged");
    }
    await writeTeamRecords({
      client: getPrismaClient(this.prisma, tx),
      scope,
      input,
      config: roster.config,
      primaryRule: roster.staffRows.get(roster.config.staffId)?.availabilityRule[0],
      staffRows: roster.staffRows,
      serviceRows: roster.serviceRows,
      lock: (key) => this.lock(scope, key, tx),
    });
    const value: OpenBukTeamConfiguration = {
      revision: input.updateId,
      fingerprint,
      staffIds: input.staff.map(({ id }) => id),
      services: input.services.map(({ id, staffIds }) => ({ id, staffIds })),
    };
    await this.kv.set({ ...settingsKey(scope, "openbuk-team"), value }, tx);
    return savedTeam(true);
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
    input: Pick<OpenBukBook, "customer">,
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
    await this.kv.set({ ...snapshotKey(scope, id), value: receipt }, tx);
    return id;
  }

  async appointments(scope: StudioScope, day: string) {
    const studio = await this.studioSettings(scope);
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
    const appointments = rows.filter((row) => studioDate(row.startAt, studio.timezone) === day);
    const snapshots = await this.kv.list({
      ...extensionScope(scope),
      keys: appointments.map((row) => snapshotKey(scope, row.id).key),
    });
    const receiptByKey = new Map(
      snapshots.map(({ key, value }) => [key, OpenBukReceiptSchema.parse(value)])
    );
    return appointments.map((row) => {
      const snapshot = receiptByKey.get(snapshotKey(scope, row.id).key);
      return {
        id: row.id,
        reference: row.referenceNumber ?? row.id,
        status: row.status,
        customerName: row.bookedByName ?? "",
        startAt: row.startAt.toISOString(),
        endAt: row.endAt.toISOString(),
        serviceName: snapshot?.serviceName ?? row.serviceOffering?.name ?? "",
        staffName: snapshot?.staffName ?? row.allocations[0]?.resource.name ?? "",
        priceCents: snapshot?.priceCents ?? row.serviceOffering?.priceCents ?? 0,
        currency: snapshot?.currency ?? row.serviceOffering?.currency ?? studio.currency,
        timezone: snapshot?.timezone ?? studio.timezone,
      };
    });
  }
}
