import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Only the future commitment and known private-file IDs need database setup.
// Identity, membership, linking, checklist approval and departure use real APIs/UI.
export async function seedStaffJourneyRecords(input: {
  tenantId: string;
  workspaceId: string;
  userId: string;
  ownerEmail: string;
}) {
  const url = process.env.OPENBUK_TEST_DATABASE_URL;
  if (!url || !/^postgres(?:ql)?:\/\/[^/]+\/openbuk_test_[a-z0-9_]+(?:\?.*)?$/.test(url)) {
    throw new Error("Staff fixture requires a disposable openbuk_test_* database");
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const owner = await prisma.workspaceMembership.findFirst({
      where: {
        workspaceId: input.workspaceId,
        userId: input.userId,
        role: "OWNER",
        workspace: { tenantId: input.tenantId },
        user: { email: input.ownerEmail },
      },
    });
    if (!owner || !/^tasks-owner-[a-f0-9-]+@example\.test$/.test(input.ownerEmail)) {
      throw new Error("Staff fixture must belong to this test's synthetic owner");
    }
    const resource = await prisma.bookingResource.create({
      data: {
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        type: "STAFF",
        name: "Anna Weber",
        tags: [],
      },
    });
    const startAt = new Date(Date.now() + 7 * 86400000);
    const booking = await prisma.booking.create({
      data: {
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        status: "CONFIRMED",
        startAt,
        endAt: new Date(startAt.getTime() + 3600000),
        bookedByEmail: "customer-private@example.test",
        notes: "Customer detail excluded from departure review",
        allocations: {
          create: {
            tenantId: input.tenantId,
            resourceId: resource.id,
            startAt,
            endAt: new Date(startAt.getTime() + 3600000),
          },
        },
      },
    });
    const document = await prisma.document.create({
      data: {
        tenantId: input.tenantId,
        type: "OTHER",
        status: "READY",
        title: "Private fixture",
        files: {
          create: {
            tenantId: input.tenantId,
            kind: "ORIGINAL",
            storageProvider: "s3",
            bucket: "local-fixture-never-fetch",
            objectKey: "private/staff-fixture",
            isPublic: false,
          },
        },
      },
      include: { files: true },
    });
    return {
      resourceId: resource.id,
      bookingId: booking.id,
      documentId: document.id,
      fileId: document.files[0].id,
    };
  } finally {
    await prisma.$disconnect();
  }
}
