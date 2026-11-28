import {
  OpenBukReceiptSchema,
  type OpenBukAppointment,
  type OpenBukStudio,
} from "@corely/contracts";
import type { PrismaService, PrismaExtKvAdapter } from "@corely/data";
import type { StudioScope } from "../../application/ports/openbuk-repository.port";
import { studioDate } from "../../domain/openbuk-availability";

const scopeKey = (scope: StudioScope) => ({
  tenantId: scope.tenantId,
  moduleId: "booking",
  scope: `workspace:${scope.workspaceId}`,
});
export const snapshotKey = (scope: StudioScope, bookingId: string) => ({
  ...scopeKey(scope),
  key: `openbuk-appointment:${bookingId}`,
});

export async function listStudioAppointments(
  prisma: PrismaService,
  kv: PrismaExtKvAdapter,
  scope: StudioScope,
  studio: OpenBukStudio,
  day: string
): Promise<OpenBukAppointment[]> {
  const midnight = Date.parse(`${day}T00:00:00Z`);
  const rows = await prisma.booking.findMany({
    where: {
      ...scope,
      startAt: {
        gte: new Date(midnight - 14 * 3_600_000),
        lt: new Date(midnight + 38 * 3_600_000),
      },
    },
    include: { serviceOffering: true, allocations: { include: { resource: true } } },
    orderBy: { startAt: "asc" },
  });
  const appointments = rows.filter((row) => studioDate(row.startAt, studio.timezone) === day);
  const snapshots = await kv.list({
    ...scopeKey(scope),
    keys: appointments.map((row) => snapshotKey(scope, row.id).key),
  });
  const receipts = new Map(
    snapshots.map(({ key, value }) => [key, OpenBukReceiptSchema.parse(value)])
  );
  return appointments.map((row) => {
    const snapshot = receipts.get(snapshotKey(scope, row.id).key);
    const resource = row.allocations[0]?.resource;
    return {
      id: row.id,
      reference: row.referenceNumber ?? row.id,
      status: row.status,
      version: row.updatedAt.toISOString(),
      serviceId: row.serviceOfferingId,
      staffId: row.allocations.length === 1 ? (resource?.id ?? null) : null,
      customerName: row.bookedByName ?? "",
      startAt: row.startAt.toISOString(),
      endAt: row.endAt.toISOString(),
      serviceName: snapshot?.serviceName ?? row.serviceOffering?.name ?? "",
      staffName: snapshot?.staffName ?? resource?.name ?? "",
      priceCents: snapshot?.priceCents ?? row.serviceOffering?.priceCents ?? 0,
      currency: snapshot?.currency ?? row.serviceOffering?.currency ?? studio.currency,
      timezone: snapshot?.timezone ?? studio.timezone,
    };
  });
}
