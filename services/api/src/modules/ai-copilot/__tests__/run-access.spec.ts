import { beforeEach, expect, it, vi } from "vitest";
import { mockDeep } from "vitest-mock-extended";
import type { Response } from "express";
import { AgentRun } from "../domain/entities/agent-run.entity";
import { GetRunUseCase } from "../application/use-cases/get-run.usecase";
import { ListMessagesUseCase } from "../application/use-cases/list-messages.usecase";
import { CreateRunUseCase } from "../application/use-cases/create-run.usecase";
import { StreamCopilotChatUseCase } from "../application/use-cases/stream-copilot-chat.usecase";
import type { AgentRunRepositoryPort } from "../application/ports/agent-run-repository.port";
import type { MessageRepositoryPort } from "../application/ports/message-repository.port";
import type { ChatStorePort } from "../application/ports/chat-store.port";
import type { CopilotIdempotencyPort } from "../application/ports/copilot-idempotency.port";
import { CopilotMessage } from "../domain/entities/message.entity";

const runs = mockDeep<AgentRunRepositoryPort>();
const messages = mockDeep<MessageRepositoryPort>();
const owned = new AgentRun("run-a", "workspace-a", "owner", "running", new Date());
const read = new GetRunUseCase(runs);
const list = new ListMessagesUseCase(messages, read);

beforeEach(() => {
  vi.clearAllMocks();
  runs.findById.mockImplementation(async ({ tenantId, runId }) =>
    tenantId === owned.tenantId && runId === owned.id ? owned : null
  );
});

it("keeps an owned run readable in its current storage scope", async () => {
  expect(await read.execute({ tenantId: "workspace-a", userId: "owner", runId: "run-a" })).toBe(
    owned
  );
});

it.each([
  { tenantId: "workspace-a", userId: "staff" },
  { tenantId: "workspace-a", userId: "manager" },
  { tenantId: "workspace-b", userId: "owner" },
  { tenantId: "foreign-tenant", userId: "owner" },
])("does not expose another user's or scope's run/messages ($tenantId/$userId)", async (ctx) => {
  await expect(read.execute({ ...ctx, runId: "run-a" })).rejects.toMatchObject({ status: 404 });
  await expect(list.execute({ ...ctx, runId: "run-a" })).rejects.toMatchObject({ status: 404 });
  expect(messages.listByRun).not.toHaveBeenCalled();
});

it("loads messages only after checking their run owner", async () => {
  const message = new CopilotMessage(
    "message",
    "workspace-a",
    "run-a",
    "assistant",
    "private output",
    new Date()
  );
  messages.listByRun.mockResolvedValue([message]);
  expect(await list.execute({ tenantId: "workspace-a", userId: "owner", runId: "run-a" })).toEqual([
    message,
  ]);
});

it("denies ownerless legacy runs rather than treating them as shared", async () => {
  runs.findById.mockResolvedValue(
    new AgentRun("legacy", "workspace-a", null, "running", new Date())
  );
  await expect(
    read.execute({ tenantId: "workspace-a", userId: "owner", runId: "legacy" })
  ).rejects.toMatchObject({ status: 404 });
});

it("rejects creation that reuses another user's run ID", async () => {
  const create = new CreateRunUseCase(runs);
  await expect(
    create.execute({ tenantId: "workspace-a", userId: "staff", runId: "run-a" })
  ).rejects.toMatchObject({ status: 404 });
  expect(runs.create).not.toHaveBeenCalled();
  expect(
    await create.execute({ tenantId: "workspace-a", userId: "owner", runId: "run-a" })
  ).toEqual({ runId: "run-a" });
});

it("checks the actual returned owner when a concurrent create returns an existing row", async () => {
  runs.findById.mockResolvedValue(null);
  runs.create.mockResolvedValue(owned);
  await expect(
    new CreateRunUseCase(runs).execute({ tenantId: "workspace-a", userId: "staff", runId: "run-a" })
  ).rejects.toMatchObject({ status: 404 });
});

it("rejects an internal stream continuation before replay, history retrieval or model execution", async () => {
  const chat = mockDeep<ChatStorePort>();
  const idempotency = mockDeep<CopilotIdempotencyPort>();
  const stream = new StreamCopilotChatUseCase(
    runs,
    chat,
    mockDeep(),
    mockDeep(),
    mockDeep(),
    mockDeep(),
    mockDeep(),
    idempotency,
    mockDeep(),
    mockDeep(),
    mockDeep(),
    mockDeep()
  );
  await expect(
    stream.execute({
      tenantId: "workspace-a",
      workspaceId: "workspace-a",
      userId: "staff",
      runId: "run-a",
      messages: [
        {
          id: "user-message",
          role: "user",
          parts: [{ type: "text", text: "Read private history" }],
        },
      ],
      idempotencyKey: "reused-key",
      response: mockDeep<Response>(),
      requestId: "request",
      environment: "test",
    })
  ).rejects.toMatchObject({ status: 404 });
  expect(chat.load).not.toHaveBeenCalled();
  expect(chat.save).not.toHaveBeenCalled();
  expect(idempotency.startOrReplay).not.toHaveBeenCalled();
});
