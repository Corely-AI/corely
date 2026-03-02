import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";
import { NestFactory } from "@nestjs/core";
import { isErr } from "@corely/kernel";
import { AppModule } from "../app.module";
import { CreateSequenceUseCase } from "../modules/crm/application/use-cases/create-sequence/create-sequence.usecase";
import { ListSequencesUseCase } from "../modules/crm/application/use-cases/list-sequences/list-sequences.usecase";

const SEQUENCE_NAME = "Lead to Won - Nails";

type Args = {
  tenantId: string;
  userId: string;
  envFile?: string;
  force: boolean;
};

function findRepoRoot(start: string): string | null {
  let current = start;
  while (true) {
    if (fs.existsSync(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function parseArgs(argv: string[]): Args {
  const parsed: Args = {
    tenantId: "",
    userId: "system",
    force: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--tenant-id") {
      parsed.tenantId = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (token === "--user-id") {
      parsed.userId = argv[i + 1] ?? parsed.userId;
      i += 1;
      continue;
    }
    if (token === "--env-file") {
      parsed.envFile = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === "--force") {
      parsed.force = true;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  if (!parsed.tenantId) {
    throw new Error("Missing required --tenant-id");
  }

  return parsed;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = findRepoRoot(process.cwd());

  if (args.envFile) {
    const resolvedEnvFile = path.isAbsolute(args.envFile)
      ? args.envFile
      : path.resolve(repoRoot ?? process.cwd(), args.envFile);
    dotenv.config({ path: resolvedEnvFile });
  } else if (repoRoot) {
    dotenv.config({ path: path.join(repoRoot, ".env") });
  } else {
    dotenv.config();
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"],
  });

  try {
    const createSequence = app.get(CreateSequenceUseCase);
    const listSequences = app.get(ListSequencesUseCase);
    const ctx = {
      tenantId: args.tenantId,
      userId: args.userId,
      correlationId: `seed-crm-nails-sequence-${Date.now()}`,
    };

    if (!args.force) {
      const listResult = await listSequences.execute({}, ctx);
      if (isErr(listResult)) {
        throw listResult.error;
      }

      const existing = listResult.value.find((sequence) => sequence.name === SEQUENCE_NAME);
      if (existing) {
        process.stdout.write(
          `Sequence already exists: ${existing.id} (${existing.name}) for tenant ${args.tenantId}\n`
        );
        return;
      }
    }

    const result = await createSequence.execute(
      {
        name: SEQUENCE_NAME,
        description: "Automated day 1/day 3/day 7 email follow-up for nails leads.",
        steps: [
          {
            stepOrder: 1,
            type: "EMAIL_AUTO",
            dayDelay: 0,
            templateSubject: "Welcome to Corely Nails",
            templateBody:
              "Hi there,\n\nThanks for your interest. You can preview our demo website here: https://nails.corely.one/\n\nReply to this email if you want us to walk you through it live.",
          },
          {
            stepOrder: 2,
            type: "EMAIL_AUTO",
            dayDelay: 3,
            templateSubject: "Quick follow-up on your nails demo",
            templateBody:
              "Hi again,\n\nJust following up to see if you had time to check the demo: https://nails.corely.one/\n\nHappy to answer any questions.",
          },
          {
            stepOrder: 3,
            type: "EMAIL_AUTO",
            dayDelay: 7,
            templateSubject: "Final follow-up this week",
            templateBody:
              "Hi,\n\nFinal follow-up from our side this week. If it helps, we can tailor the setup for your business.\n\nDemo link: https://nails.corely.one/",
          },
        ],
      },
      ctx
    );

    if (isErr(result)) {
      throw result.error;
    }

    process.stdout.write(
      `Created sequence ${result.value.id} (${result.value.name}) for tenant ${args.tenantId}\n`
    );
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Error: ${message}\n`);
  process.exitCode = 1;
});
