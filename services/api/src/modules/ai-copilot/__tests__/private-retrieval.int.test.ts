import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { createTestDb, type PostgresTestDb, stopSharedContainer } from "@corely/testkit";
import { resetPrisma, type PrismaService } from "@corely/data";
import type { Prisma } from "@prisma/client";
import { PrismaAgentRunRepository } from "../infrastructure/adapters/prisma-agent-run-repository.adapter";
import { PrismaMessageRepository } from "../infrastructure/adapters/prisma-message-repository.adapter";
import { PrismaThreadHistoryRepository } from "../infrastructure/adapters/prisma-thread-history-repository.adapter";
import { GetRunUseCase } from "../application/use-cases/get-run.usecase";
import { ListMessagesUseCase } from "../application/use-cases/list-messages.usecase";
import { SearchCopilotMessagesUseCase } from "../application/use-cases/search-copilot-messages.usecase";
import { ListCopilotThreadMessagesUseCase } from "../application/use-cases/list-copilot-thread-messages.usecase";
import { CreateRunUseCase } from "../application/use-cases/create-run.usecase";
import { PrismaChatStoreAdapter } from "../infrastructure/adapters/prisma-chat-store.adapter";

vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });
let db: PostgresTestDb;
let prisma: PrismaService;
let runs: PrismaAgentRunRepository;
let messages: PrismaMessageRepository;
let history: PrismaThreadHistoryRepository;

beforeAll(async () => {
  db = await createTestDb();
  prisma = db.client;
  runs = new PrismaAgentRunRepository(prisma);
  messages = new PrismaMessageRepository(prisma);
  history = new PrismaThreadHistoryRepository(prisma);
});
beforeEach(async () => {
  vi.restoreAllMocks();
  await db.reset();
  for (const [id, tenantId, userId, text] of [
    ["run-a", "workspace-a", "owner", "sensitive owner-a"],
    ["run-staff", "workspace-a", "staff", "sensitive staff-a"],
    ["run-a2", "workspace-a2", "owner", "sensitive owner-a2"],
    ["run-b", "foreign-tenant-workspace", "owner", "sensitive owner-b"],
  ]) {
    await runs.create({ id, tenantId, createdByUserId: userId, status: "running", title: id });
    await messages.create({
      id: `message-${id}`,
      tenantId,
      runId: id,
      role: "assistant",
      partsJson: JSON.stringify([{ type: "text", text }]),
    });
  }
});
afterAll(async () => {
  await db?.down();
  await resetPrisma();
  await stopSharedContainer();
});

it("keeps direct reads and message exports private to the creator and storage scope", async () => {
  const read = new GetRunUseCase(runs);
  const list = new ListMessagesUseCase(messages, read);
  const own = { tenantId: "workspace-a", userId: "owner", runId: "run-a" };
  expect((await list.execute(own))[0]?.partsJson).toContain("sensitive owner-a");
  for (const ctx of [
    { ...own, userId: "staff" },
    { ...own, tenantId: "workspace-a2" },
    { ...own, tenantId: "foreign-tenant-workspace" },
  ]) {
    await expect(read.execute(ctx)).rejects.toMatchObject({ status: 404 });
    await expect(list.execute(ctx)).rejects.toMatchObject({ status: 404 });
  }
});

it("searches only the current creator's messages in the selected workspace", async () => {
  const search = new SearchCopilotMessagesUseCase(history);
  const result = await search.execute({
    tenantId: "workspace-a",
    userId: "owner",
    query: "sensitive",
  });
  expect(result.items.map((item) => item.threadId)).toEqual(["run-a"]);
  expect(result.items[0]?.snippet).toContain("sensitive owner-a");
  expect(JSON.stringify(result)).not.toContain("staff-a");
  expect(
    (
      await search.execute({ tenantId: "workspace-a2", userId: "owner", query: "sensitive" })
    ).items.map((item) => item.threadId)
  ).toEqual(["run-a2"]);
});

it("does not return another creator's modern thread history", async () => {
  const list = new ListCopilotThreadMessagesUseCase(history);
  expect(
    (await list.execute({ tenantId: "workspace-a", userId: "staff", threadId: "run-a" })).items
  ).toEqual([]);
  expect(
    (await list.execute({ tenantId: "workspace-a", userId: "owner", threadId: "run-a" })).items
  ).toHaveLength(1);
});

it("excludes inconsistent cross-scope message relations from history and search", async () => {
  // The schema has no composite message/run scope FK; retrieval must validate both sides.
  await messages.create({
    id: "cross-linked",
    tenantId: "workspace-a",
    runId: "run-b",
    role: "assistant",
    partsJson: JSON.stringify([{ type: "text", text: "sensitive cross-linked foreign content" }]),
  });
  expect(
    (
      await history.listMessages({
        tenantId: "workspace-a",
        userId: "owner",
        threadId: "run-b",
        pageSize: 20,
      })
    ).items
  ).toEqual([]);
  const search = await history.searchMessages({
    tenantId: "workspace-a",
    userId: "owner",
    query: "sensitive",
    pageSize: 20,
  });
  expect(search.items.map((item) => item.threadId)).toEqual(["run-a"]);
});

it("denies an actual unique-key fallback to another creator after a stale preflight read", async () => {
  vi.spyOn(runs, "findById").mockResolvedValueOnce(null);
  await expect(
    new CreateRunUseCase(runs).execute({ tenantId: "workspace-a", userId: "staff", runId: "run-a" })
  ).rejects.toMatchObject({ status: 404 });
  expect((await prisma.agentRun.findUnique({ where: { id: "run-a" } }))?.createdByUserId).toBe(
    "owner"
  );
});

it.each(["repository", "chat-store"] as const)(
  "does not overwrite another conversation through %s",
  async (writer) => {
    const before = await prisma.message.findUniqueOrThrow({ where: { id: "message-run-a" } });
    const saving =
      writer === "repository"
        ? messages.upsert({
            id: before.id,
            tenantId: "workspace-a",
            runId: "run-staff",
            role: "user",
            partsJson: "replacement",
          })
        : new PrismaChatStoreAdapter(prisma).save({
            chatId: "run-staff",
            tenantId: "workspace-a",
            messages: [
              { id: before.id, role: "user", parts: [{ type: "text", text: "replacement" }] },
            ],
          });
    await expect(saving).rejects.toThrow("Message scope mismatch");
    expect(await prisma.message.findUniqueOrThrow({ where: { id: before.id } })).toEqual(before);
  }
);

it("denies another run's message on the concurrent unique-key retry path", async () => {
  const before = await prisma.message.findUniqueOrThrow({ where: { id: "message-run-a" } });
  let stalePreflight = true;
  const racedClient = new Proxy(prisma, {
    get(target, property, receiver) {
      if (property !== "message") return Reflect.get(target, property, receiver);
      return {
        findUnique: async (args: Prisma.MessageFindUniqueArgs) => {
          if (stalePreflight) {
            stalePreflight = false;
            return null;
          }
          return prisma.message.findUnique(args);
        },
        create: prisma.message.create.bind(prisma.message),
        update: prisma.message.update.bind(prisma.message),
      };
    },
  });
  await expect(
    new PrismaChatStoreAdapter(racedClient).save({
      chatId: "run-staff",
      tenantId: "workspace-a",
      messages: [{ id: before.id, role: "user", parts: [{ type: "text", text: "replacement" }] }],
    })
  ).rejects.toThrow("Message scope mismatch");
  expect(await prisma.message.findUniqueOrThrow({ where: { id: before.id } })).toEqual(before);
});

it("preserves updates within the same conversation", async () => {
  const store = new PrismaChatStoreAdapter(prisma);
  await store.save({
    chatId: "run-a",
    tenantId: "workspace-a",
    messages: [
      { id: "message-run-a", role: "assistant", parts: [{ type: "text", text: "continued" }] },
    ],
  });
  expect(
    (await store.load({ chatId: "run-a", tenantId: "workspace-a" })).messages[0].parts
  ).toEqual([{ type: "text", text: "continued" }]);
});
