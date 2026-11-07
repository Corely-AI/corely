import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { mockDeep } from "vitest-mock-extended";
import { EnvService } from "@corely/config";
import { CopilotController } from "../adapters/http/copilot.controller";
import { AuthGuard } from "../../identity/adapters/http/auth.guard";
import { AuthorizeRequestContextUseCase } from "../../identity/application/use-cases/authorize-request-context.usecase";
import { Membership } from "../../identity/domain/entities/membership.entity";
import type { MembershipRepositoryPort } from "../../identity/application/ports/membership-repository.port";
import type { TokenServicePort } from "../../identity/application/ports/token-service.port";
import type { WorkspaceRepositoryPort } from "../../workspaces/application/ports/workspace-repository.port";
import { AuthorizeWorkspaceUseCase } from "../../workspaces/public";
import { WorkspaceExperienceResolverService } from "../../platform/application/services/workspace-experience-resolver.service";
import { AgentRun } from "../domain/entities/agent-run.entity";
import { CopilotMessage } from "../domain/entities/message.entity";
import type { AgentRunRepositoryPort } from "../application/ports/agent-run-repository.port";
import type { MessageRepositoryPort } from "../application/ports/message-repository.port";
import { CreateRunUseCase } from "../application/use-cases/create-run.usecase";
import { GetRunUseCase } from "../application/use-cases/get-run.usecase";
import { ListMessagesUseCase } from "../application/use-cases/list-messages.usecase";
import { StreamCopilotChatUseCase } from "../application/use-cases/stream-copilot-chat.usecase";
import { CreateCopilotThreadUseCase } from "../application/use-cases/create-copilot-thread.usecase";
import { GetCopilotThreadUseCase } from "../application/use-cases/get-copilot-thread.usecase";
import { ListCopilotThreadsUseCase } from "../application/use-cases/list-copilot-threads.usecase";
import { ListCopilotThreadMessagesUseCase } from "../application/use-cases/list-copilot-thread-messages.usecase";
import { SearchCopilotMessagesUseCase } from "../application/use-cases/search-copilot-messages.usecase";

let app: INestApplication;
const revoked = new Set<string>();
const runs = mockDeep<AgentRunRepositoryPort>();
const messages = mockDeep<MessageRepositoryPort>();
const run = new AgentRun(
  "run-a",
  "workspace-a",
  "owner",
  "running",
  new Date(),
  undefined,
  "synthetic private metadata"
);
const read = new GetRunUseCase(runs);

beforeAll(async () => {
  const members = mockDeep<MembershipRepositoryPort>();
  members.findByTenantAndUser.mockImplementation(async (tenantId, userId) =>
    tenantId === "tenant-a" && !revoked.has(userId)
      ? Membership.create(`member-${userId}`, tenantId, userId, `${userId}-role`)
      : null
  );
  const workspaces = mockDeep<WorkspaceRepositoryPort>();
  workspaces.getWorkspaceById.mockImplementation(async (tenantId, id) =>
    tenantId === "tenant-a" && ["workspace-a", "workspace-a2"].includes(id)
      ? {
          id,
          tenantId,
          legalEntityId: "legal",
          name: id,
          onboardingStatus: "NEW",
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      : null
  );
  workspaces.getMembershipByUserAndWorkspace.mockImplementation(async (workspaceId, userId) => ({
    id: `wm-${userId}`,
    userId,
    workspaceId,
    role: "MEMBER",
    status: "ACTIVE",
    createdAt: new Date(),
  }));
  const tokens = mockDeep<TokenServicePort>();
  tokens.verifyAccessToken.mockImplementation(async (token) =>
    ["owner", "staff", "manager"].includes(token)
      ? {
          userId: token,
          tenantId: "tenant-a",
          roleIds: [`${token}-role`],
          email: "synthetic@example.invalid",
          iat: 0,
          exp: 9999999999,
        }
      : null
  );
  const module = await Test.createTestingModule({
    controllers: [CopilotController],
    providers: [
      { provide: CreateRunUseCase, useValue: new CreateRunUseCase(runs) },
      { provide: GetRunUseCase, useValue: read },
      { provide: ListMessagesUseCase, useValue: new ListMessagesUseCase(messages, read) },
      ...[
        StreamCopilotChatUseCase,
        CreateCopilotThreadUseCase,
        GetCopilotThreadUseCase,
        ListCopilotThreadsUseCase,
        ListCopilotThreadMessagesUseCase,
        SearchCopilotMessagesUseCase,
        EnvService,
        WorkspaceExperienceResolverService,
      ].map((provide) => ({ provide, useValue: mockDeep() })),
    ],
  })
    .overrideGuard(AuthGuard)
    .useValue(
      new AuthGuard(
        tokens,
        new AuthorizeRequestContextUseCase(members, new AuthorizeWorkspaceUseCase(workspaces))
      )
    )
    .compile();
  app = module.createNestApplication();
  await app.init();
});
beforeEach(() => {
  revoked.clear();
  vi.clearAllMocks();
  runs.findById.mockImplementation(async ({ tenantId, runId }) =>
    tenantId === "workspace-a" && runId === run.id ? run : null
  );
  messages.listByRun.mockResolvedValue([
    new CopilotMessage(
      "message-a",
      "workspace-a",
      "run-a",
      "assistant",
      JSON.stringify([{ type: "text", text: "synthetic private conversation" }]),
      new Date()
    ),
  ]);
});
afterAll(async () => {
  await app?.close();
});

const paths = ["runs/run-a", "runs/run-a/messages", "chat/run-a/history", "chat/run-a/stream"];
const get = (path: string, userId = "owner", workspaceId = "workspace-a") =>
  request(app.getHttpServer())
    .get(path)
    .set("Authorization", `Bearer ${userId}`)
    .set("X-Workspace-Id", workspaceId);

it.each(paths)("preserves owned retrieval with no-store: %s", async (path) => {
  const response = await get(`/copilot/${path}`);
  expect(response.status).toBe(path.endsWith("stream") ? 204 : 200);
  expect(response.headers["cache-control"]).toBe("private, no-store");
});

it.each(paths)(
  "denies staff and manager access to another creator on both aliases: %s",
  async (path) => {
    for (const alias of ["copilot", "ai-copilot"]) {
      for (const userId of ["staff", "manager"]) {
        const response = await get(`/${alias}/${path}`, userId);
        expect(response.status).toBe(404);
        expect(JSON.stringify(response.body)).not.toContain("synthetic private");
      }
    }
    expect(messages.listByRun).not.toHaveBeenCalled();
  }
);

it("does not allow run creation to reuse another creator's ID", async () => {
  const response = await request(app.getHttpServer())
    .post("/copilot/runs")
    .set("Authorization", "Bearer staff")
    .set("X-Workspace-Id", "workspace-a")
    .set("X-Idempotency-Key", "new-key")
    .send({ id: "run-a" });
  expect(response.status).toBe(404);
  expect(runs.create).not.toHaveBeenCalled();
});

it("revalidates membership and workspace selection even for a conversation's creator", async () => {
  expect((await get("/copilot/runs/run-a", "owner", "workspace-a2")).status).toBe(404);
  expect((await get("/copilot/runs/run-a", "owner", "foreign-workspace")).status).toBe(403);
  revoked.add("owner");
  expect((await get("/copilot/chat/run-a/history")).status).toBe(403);
  expect(messages.listByRun).not.toHaveBeenCalled();
});

it("rejects anonymous retrieval and ignores a forged user header", async () => {
  expect((await request(app.getHttpServer()).get("/copilot/runs/run-a")).status).toBe(401);
  const response = await get("/copilot/runs/run-a", "staff").set("X-User-Id", "owner");
  expect(response.status).toBe(404);
});
