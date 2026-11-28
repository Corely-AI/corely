import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID } from "node:crypto";

// Installation is a deployment prerequisite. The existing host-only app controller
// cannot install into a tenant session; do not weaken it for browser setup.
export async function provisionTaskApps(
  input: {
    tenantId: string;
    userId: string;
    ownerEmail: string;
  },
  { operationalOnly = false } = {}
) {
  const url = process.env.OPENBUK_TEST_DATABASE_URL;
  if (!url || !/^postgres(?:ql)?:\/\/[^/]+\/openbuk_test_[a-z0-9_]+(?:\?.*)?$/.test(url)) {
    throw new Error("Task fixture requires a disposable openbuk_test_* database");
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const [database] = await prisma.$queryRaw<
      Array<{ name: string }>
    >`SELECT current_database() AS name`;
    if (!database?.name.startsWith("openbuk_test_")) {
      throw new Error("Unsafe task fixture database");
    }
    const owner = await prisma.membership.findFirst({
      where: { tenantId: input.tenantId, userId: input.userId, user: { email: input.ownerEmail } },
    });
    if (!owner || !/^tasks-owner-[a-f0-9-]+@example\.test$/.test(input.ownerEmail)) {
      throw new Error("Task fixture must belong to this test's synthetic owner");
    }
    const apps = operationalOnly ? ["booking", "people", "tasks"] : ["people", "tasks"];
    for (const appId of apps) {
      await prisma.tenantAppInstall.upsert({
        where: { tenantId_appId: { tenantId: input.tenantId, appId } },
        create: {
          id: randomUUID(),
          tenantId: input.tenantId,
          appId,
          enabled: true,
          installedVersion: "1.0.0",
          enabledAt: new Date(),
          enabledByUserId: input.userId,
        },
        update: { enabled: true },
      });
    }
    if (operationalOnly) {
      await prisma.tenantAppInstall.updateMany({
        where: {
          tenantId: input.tenantId,
          appId: { notIn: ["core", "platform", "workspaces", "parties", ...apps] },
        },
        data: { enabled: false },
      });
    }
    const installs = await prisma.tenantAppInstall.findMany({
      where: { tenantId: input.tenantId, enabled: true },
      select: { appId: true },
    });
    return installs.map(({ appId }) => appId);
  } finally {
    await prisma.$disconnect();
  }
}
