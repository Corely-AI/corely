import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { PrismaService } from "@corely/data";
import { PermissionEffect, RoleScope } from "@prisma/client";
import { PLATFORM_HOST_PERMISSION_KEYS } from "../modules/identity/application/policies/platform-permissions.policy";

const DEFAULT_EMAIL = "ha.doanmanh@gmail.com";

const findRepoRoot = (start: string): string | null => {
  let current = start;
  while (true) {
    const pkg = path.join(current, "package.json");
    if (fs.existsSync(pkg)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
};

const parseArgs = (args: string[]) => {
  const result: { email: string; envFile?: string } = { email: DEFAULT_EMAIL };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--email") {
      result.email = args[i + 1] ?? result.email;
      i += 1;
      continue;
    }
    if (arg === "--env") {
      result.envFile = args[i + 1];
      i += 1;
    }
  }
  return result;
};

async function main(): Promise<void> {
  const { email, envFile } = parseArgs(process.argv.slice(2));

  const repoRoot = findRepoRoot(process.cwd());
  if (envFile) {
    const resolvedEnvFile = path.isAbsolute(envFile)
      ? envFile
      : path.resolve(repoRoot ?? process.cwd(), envFile);
    dotenv.config({ path: resolvedEnvFile });
  } else if (repoRoot) {
    dotenv.config({ path: path.join(repoRoot, ".env") });
  } else {
    dotenv.config();
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }

  const prisma = new PrismaService();
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
    if (!user) {
      throw new Error(`User not found: ${email}`);
    }

    const role = await prisma.role.upsert({
      where: { id: "cl-superadmin-role" },
      create: {
        id: "cl-superadmin-role",
        tenantId: null,
        name: "SuperAdmin",
        scope: RoleScope.HOST,
        systemKey: "SUPERADMIN",
        isSystem: true,
      },
      update: {
        name: "SuperAdmin",
        scope: RoleScope.HOST,
        systemKey: "SUPERADMIN",
        isSystem: true,
      },
      select: { id: true },
    });

    const existingHostMembership = await prisma.membership.findFirst({
      where: { userId: user.id, tenantId: null },
      select: { id: true },
    });

    if (existingHostMembership) {
      await prisma.membership.update({
        where: { id: existingHostMembership.id },
        data: { roleId: role.id },
      });
    } else {
      await prisma.membership.create({
        data: {
          id: `cl-superadmin-membership-${user.id}`,
          tenantId: null,
          userId: user.id,
          roleId: role.id,
        },
      });
    }

    const permissionKeys = Array.from(PLATFORM_HOST_PERMISSION_KEYS);
    if (permissionKeys.length === 0) {
      throw new Error("No platform permissions defined in PLATFORM_HOST_PERMISSION_KEYS.");
    }

    await prisma.rolePermissionGrant.createMany({
      data: permissionKeys.map((key) => ({
        id: `rpc-${role.id}-${key}`,
        tenantId: null,
        roleId: role.id,
        permissionKey: key,
        effect: PermissionEffect.ALLOW,
      })),
      skipDuplicates: true,
    });

    await prisma.rolePermissionGrant.updateMany({
      where: { tenantId: null, roleId: role.id, permissionKey: { in: permissionKeys } },
      data: { effect: PermissionEffect.ALLOW },
    });

    const totalGrants = await prisma.rolePermissionGrant.count({
      where: { tenantId: null, roleId: role.id },
    });

    process.stdout.write(`SuperAdmin updated for ${user.email}.\n`);
    process.stdout.write(`Host role: ${role.id}\n`);
    process.stdout.write(`Total host grants: ${totalGrants}\n`);
  } finally {
    await prisma.onModuleDestroy();
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Error: ${message}\n`);
  process.exitCode = 1;
});
