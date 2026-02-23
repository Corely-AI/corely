import process from "node:process";
import { PrismaService } from "@corely/data";
import { type DirectoryRestaurantStatus } from "@prisma/client";

type CliOptions = {
  tenantId: string;
  workspaceId: string;
  slugPrefix: string;
  namePrefix: string;
  yes: boolean;
};

type SeedRow = {
  slug: string;
  name: string;
  shortDescription: string;
  dishTags: string[];
  neighborhoodSlug: string;
  addressLine: string;
  postalCode: string;
  status: DirectoryRestaurantStatus;
};

const DEFAULT_TENANT_ID = "directory-public-tenant";
const DEFAULT_WORKSPACE_ID = "directory-public-workspace";

function parseArgs(argv: string[]): CliOptions {
  const defaults: CliOptions = {
    tenantId: process.env.DIRECTORY_PUBLIC_TENANT_ID ?? DEFAULT_TENANT_ID,
    workspaceId: process.env.DIRECTORY_PUBLIC_WORKSPACE_ID ?? DEFAULT_WORKSPACE_ID,
    slugPrefix: "",
    namePrefix: "Directory Seed",
    yes: false,
  };

  const args = [...argv];

  while (args.length > 0) {
    const token = args.shift();
    if (!token) {
      break;
    }

    if (token === "--tenant-id") {
      const value = args.shift();
      if (!value) {
        throw new Error("Missing value for --tenant-id");
      }
      defaults.tenantId = value;
      continue;
    }

    if (token === "--workspace-id") {
      const value = args.shift();
      if (!value) {
        throw new Error("Missing value for --workspace-id");
      }
      defaults.workspaceId = value;
      continue;
    }

    if (token === "--slug-prefix") {
      const value = args.shift();
      if (value === undefined) {
        throw new Error("Missing value for --slug-prefix");
      }
      defaults.slugPrefix = value;
      continue;
    }

    if (token === "--name-prefix") {
      const value = args.shift();
      if (!value) {
        throw new Error("Missing value for --name-prefix");
      }
      defaults.namePrefix = value;
      continue;
    }

    if (token === "--yes") {
      defaults.yes = true;
      continue;
    }

    throw new Error(`Unknown arg: ${token}`);
  }

  return defaults;
}

function toRows(options: CliOptions): SeedRow[] {
  const slugPrefix = options.slugPrefix;
  const namePrefix = options.namePrefix;

  return [
    {
      slug: `${slugPrefix}pho-bar-neukoelln`,
      name: `${namePrefix} Pho Bar Neukoelln`,
      shortDescription: "Pho and banh mi in Neukolln",
      dishTags: ["pho", "banh-mi"],
      neighborhoodSlug: "neukoelln",
      addressLine: "Weserstr. 10",
      postalCode: "12045",
      status: "ACTIVE",
    },
    {
      slug: `${slugPrefix}bun-cha-mitte`,
      name: `${namePrefix} Bun Cha Mitte`,
      shortDescription: "Bun cha and grilled classics in Mitte",
      dishTags: ["bun-cha"],
      neighborhoodSlug: "mitte",
      addressLine: "Torstr. 20",
      postalCode: "10119",
      status: "ACTIVE",
    },
    {
      slug: `${slugPrefix}hidden-test-place`,
      name: `${namePrefix} Hidden Test Place`,
      shortDescription: "Hidden fixture entry",
      dishTags: ["pho"],
      neighborhoodSlug: "mitte",
      addressLine: "Invalidenstr. 1",
      postalCode: "10115",
      status: "HIDDEN",
    },
  ];
}

async function run(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (process.env.NODE_ENV === "production" && !options.yes) {
    throw new Error("Refusing to seed in production without --yes");
  }

  const prisma = new PrismaService();
  const rows = toRows(options);

  let created = 0;
  let updated = 0;

  try {
    for (const row of rows) {
      const existing = await prisma.directoryRestaurant.findUnique({
        where: {
          tenantId_workspaceId_slug: {
            tenantId: options.tenantId,
            workspaceId: options.workspaceId,
            slug: row.slug,
          },
        },
        select: {
          id: true,
        },
      });

      if (existing) {
        updated += 1;
      } else {
        created += 1;
      }

      await prisma.directoryRestaurant.upsert({
        where: {
          tenantId_workspaceId_slug: {
            tenantId: options.tenantId,
            workspaceId: options.workspaceId,
            slug: row.slug,
          },
        },
        update: {
          name: row.name,
          shortDescription: row.shortDescription,
          dishTags: row.dishTags,
          neighborhoodSlug: row.neighborhoodSlug,
          addressLine: row.addressLine,
          postalCode: row.postalCode,
          city: "Berlin",
          status: row.status,
        },
        create: {
          tenantId: options.tenantId,
          workspaceId: options.workspaceId,
          slug: row.slug,
          name: row.name,
          shortDescription: row.shortDescription,
          dishTags: row.dishTags,
          neighborhoodSlug: row.neighborhoodSlug,
          addressLine: row.addressLine,
          postalCode: row.postalCode,
          city: "Berlin",
          status: row.status,
        },
      });
    }

    process.stdout.write(
      `${JSON.stringify({
        tenantId: options.tenantId,
        workspaceId: options.workspaceId,
        slugPrefix: options.slugPrefix,
        created,
        updated,
        total: rows.length,
      })}\n`
    );
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((error) => {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
