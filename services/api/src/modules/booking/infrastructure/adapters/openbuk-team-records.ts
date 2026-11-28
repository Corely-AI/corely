import { BadRequestException, ConflictException } from "@nestjs/common";
import type { OpenBukStudio, OpenBukTeamUpdate } from "@corely/contracts";
import { Prisma, type BookingAvailabilityRule } from "@prisma/client";
import type { StudioScope } from "../../application/ports/openbuk-repository.port";

export function findTeamCommitments(
  client: Prisma.TransactionClient,
  scope: StudioScope,
  now: Date,
  serviceIds: string[],
  staffIds: string[]
) {
  return client.booking.findMany({
    where: {
      ...scope,
      endAt: { gt: now },
      status: { in: ["HOLD", "CONFIRMED"] },
      OR: [
        { serviceOfferingId: { in: serviceIds } },
        { allocations: { some: { tenantId: scope.tenantId, resourceId: { in: staffIds } } } },
      ],
    },
    select: { serviceOfferingId: true, allocations: { select: { resourceId: true } } },
  });
}

export async function writeTeamRecords({
  client,
  scope,
  input,
  config,
  primaryRule,
  staffRows,
  serviceRows,
  lock,
}: {
  client: Prisma.TransactionClient;
  scope: StudioScope;
  input: OpenBukTeamUpdate;
  config: OpenBukStudio;
  primaryRule?: Pick<BookingAvailabilityRule, "timezone" | "weeklySlots">;
  staffRows: ReadonlyMap<string, unknown>;
  serviceRows: ReadonlyMap<string, unknown>;
  lock: (key: string) => Promise<void>;
}) {
  // Existing records must explicitly be archived instead of disappearing.
  const validate = (
    rows: Pick<OpenBukTeamUpdate["staff"][number], "id" | "create">[],
    existing: ReadonlyMap<string, unknown>
  ) =>
    rows.filter((row) => !row.create).length === existing.size &&
    rows.every((row) => Boolean(row.create) === !existing.has(row.id));
  if (!validate(input.staff, staffRows) || !validate(input.services, serviceRows)) {
    throw new BadRequestException("Select booking records from this studio");
  }
  for (const id of input.staff.map((staff) => staff.id).sort()) {
    await lock(id);
  }
  for (const id of input.services.map((service) => service.id).sort()) {
    await lock(`service:${id}`);
  }
  try {
    for (const member of input.staff) {
      const data = { name: member.staffName, isActive: member.active };
      if (!member.create) {
        await client.bookingResource.update({
          where: { ...scope, id: member.id, type: "STAFF" },
          data: member.id === config.staffId ? { isActive: member.active } : data,
        });
        continue;
      }
      await client.bookingResource.create({
        data: { ...scope, ...data, id: member.id, type: "STAFF", capacity: 1, tags: [] },
      });
      await client.bookingAvailabilityRule.create({
        data: {
          tenantId: scope.tenantId,
          resourceId: member.id,
          timezone: primaryRule?.timezone ?? config.timezone,
          weeklySlots: primaryRule?.weeklySlots ?? config.weeklyHours,
          blackouts: [],
        },
      });
    }
    for (const service of input.services) {
      const data = {
        name: service.serviceName,
        isActive: service.active,
        durationMinutes: service.durationMinutes,
        priceCents: service.priceCents,
        bufferBeforeMinutes: service.bufferBeforeMinutes,
        bufferAfterMinutes: service.bufferAfterMinutes,
      };
      if (!service.create) {
        await client.bookingServiceOffering.update({
          where: { ...scope, id: service.id },
          data: service.id === config.serviceId ? { isActive: service.active } : data,
        });
        continue;
      }
      await client.bookingServiceOffering.create({
        data: {
          ...scope,
          ...data,
          id: service.id,
          currency: config.currency,
          requiredResourceTypes: ["STAFF"],
          requiredTags: [],
        },
      });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictException("Booking:TeamChanged");
    }
    throw error;
  }
}
