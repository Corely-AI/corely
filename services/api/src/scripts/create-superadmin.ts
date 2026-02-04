import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { PermissionEffect, RoleScope } from "@prisma/client";
import { PrismaService } from "@corely/data";

function findRepoRoot(startDir: string): string | null {
  let currentDir = startDir;
  // Stop at filesystem root
  while (true) {
    const markerPath = path.join(currentDir, "pnpm-workspace.yaml");
    if (fs.existsSync(markerPath)) {
      return currentDir;
    }
    const parent = path.dirname(currentDir);
    if (parent === currentDir) {
      return null;
    }
    currentDir = parent;
  }
}

async function promptLine(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function promptHidden(question: string): Promise<string> {
  if (!process.stdin.isTTY) {
    const fromEnv = process.env.CORELY_SUPERADMIN_PASSWORD;
    if (!fromEnv) {
      throw new Error(
        "No TTY available for password prompt. Set CORELY_SUPERADMIN_PASSWORD in the environment."
      );
    }
    return fromEnv;
  }

  const stdin = process.stdin;
  const stdout = process.stdout;

  stdin.setEncoding("utf8");
  stdin.resume();
  stdin.setRawMode(true);

  let value = "";
  stdout.write(question);

  return new Promise((resolve, reject) => {
    const onData = (char: string) => {
      // Ctrl+C
      if (char === "\u0003") {
        stdout.write("\n");
        cleanup();
        reject(new Error("Aborted"));
        return;
      }

      // Enter
      if (char === "\r" || char === "\n") {
        stdout.write("\n");
        cleanup();
        resolve(value);
        return;
      }

      // Backspace (DEL)
      if (char === "\u007f") {
        if (value.length > 0) {
          value = value.slice(0, -1);
          stdout.write("\b \b");
        }
        return;
      }

      // Ignore other control chars
      if (char < " " || char === "\u007f") {
        return;
      }

      value += char;
      stdout.write("*");
    };

    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off("data", onData);
    };

    stdin.on("data", onData);
  });
}

function parseArgs(argv: string[]): {
  email: string;
  name: string;
  skipConfirm: boolean;
  envFile: string | null;
} {
  const defaults = {
    email: "ha.doanmanh@gmail.com",
    name: "Ha Doan",
    skipConfirm: false,
    envFile: null as string | null,
  };
  const args = [...argv];
  while (args.length > 0) {
    const token = args.shift();
    if (!token) break;
    if (token === "--email") {
      const email = args.shift();
      if (!email) throw new Error("Missing value for --email");
      defaults.email = email;
      continue;
    }
    if (token === "--name") {
      const name = args.shift();
      if (!name) throw new Error("Missing value for --name");
      defaults.name = name;
      continue;
    }
    if (token === "--yes") {
      defaults.skipConfirm = true;
      continue;
    }
    if (token === "--env-file") {
      const envFile = args.shift();
      if (!envFile) throw new Error("Missing value for --env-file");
      defaults.envFile = envFile;
      continue;
    }
    throw new Error(`Unknown arg: ${token}`);
  }
  return defaults;
}

async function main(): Promise<void> {
  const { email, name, skipConfirm, envFile } = parseArgs(process.argv.slice(2));

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

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  const db = new URL(databaseUrl);
  const dbHost = db.host;
  const dbName = (db.pathname || "").replace(/^\//, "") || "(unknown)";

  if (!skipConfirm) {
    const answer = await promptLine(
      `This will modify the database at ${dbHost} (db: ${dbName}). Continue? (yes/no) `
    );
    if (answer.trim().toLowerCase() !== "yes") {
      process.stdout.write("Canceled.\n");
      return;
    }
  }

  const password = await promptHidden("SuperAdmin password: ");
  const confirm = await promptHidden("Confirm password: ");
  if (password !== confirm) {
    throw new Error("Passwords do not match.");
  }
  if (password.length < 12) {
    throw new Error("Password must be at least 12 characters.");
  }

  const prisma = new PrismaService();
  try {
    const passwordHash = await bcrypt.hash(password, 10);

    let createdGrantCount = 0;
    let totalGrantCount = 0;
    let hostMembershipId: string | null = null;

    await prisma.$transaction(async (tx) => {
      const role = await tx.role.upsert({
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

      const user = await tx.user.upsert({
        where: { email },
        create: {
          id: "cl-ha-user",
          email,
          name,
          passwordHash,
          status: "ACTIVE",
        },
        update: {
          name,
          passwordHash,
          status: "ACTIVE",
        },
        select: { id: true },
      });

      const existingHostMembership = await tx.membership.findFirst({
        where: { userId: user.id, tenantId: null },
        select: { id: true },
      });

      if (existingHostMembership) {
        await tx.membership.update({
          where: { id: existingHostMembership.id },
          data: { roleId: role.id },
        });
        hostMembershipId = existingHostMembership.id;
      } else {
        const created = await tx.membership.create({
          data: {
            id: "cl-ha-superadmin-membership",
            tenantId: null,
            userId: user.id,
            roleId: role.id,
          },
          select: { id: true },
        });
        hostMembershipId = created.id;
      }

      const permissions = await tx.permission.findMany({ select: { key: true } });
      if (permissions.length > 0) {
        const result = await tx.rolePermissionGrant.createMany({
          data: permissions.map((p) => ({
            id: `rpc-${p.key}-grant`,
            tenantId: null,
            roleId: role.id,
            permissionKey: p.key,
            effect: PermissionEffect.ALLOW,
          })),
          skipDuplicates: true,
        });
        createdGrantCount = result.count;

        await tx.rolePermissionGrant.updateMany({
          where: { tenantId: null, roleId: role.id },
          data: { effect: PermissionEffect.ALLOW },
        });

        totalGrantCount = await tx.rolePermissionGrant.count({
          where: { tenantId: null, roleId: role.id },
        });
      }
    });

    process.stdout.write(`SuperAdmin ensured for ${email}.\n`);
    if (hostMembershipId) {
      process.stdout.write(`Host membership: ${hostMembershipId}\n`);
    }
    if (totalGrantCount > 0) {
      process.stdout.write(`Permission grants: ${totalGrantCount} (added ${createdGrantCount})\n`);
    }
  } finally {
    await prisma.onModuleDestroy();
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Error: ${message}\n`);
  process.exitCode = 1;
});
