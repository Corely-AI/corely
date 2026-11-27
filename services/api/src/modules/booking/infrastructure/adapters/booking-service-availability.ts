import { ConflictException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

/** Serialize new bookings and holds with service archiving after resource locks. */
export async function assertBookingServiceAvailable(
  tx: Prisma.TransactionClient,
  tenantId: string,
  workspaceId: string | null,
  serviceId: string | null
) {
  if (!serviceId) {
    return;
  }
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${tenantId}:service:${serviceId}`}, 0))::text`;
  const service = await tx.bookingServiceOffering.findFirst({
    where: {
      id: serviceId,
      tenantId,
      isActive: true,
      OR: [{ workspaceId }, { workspaceId: null }],
    },
    select: { id: true },
  });
  if (!service) {
    throw new ConflictException("Booking:ServiceUnavailable");
  }
}
