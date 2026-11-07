import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { Controller, Get, Post, UseGuards, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { mockDeep } from "vitest-mock-extended";
import { AuthClient } from "../../../../../../packages/auth-client/src/auth-client";
import type { TokenStorage } from "../../../../../../packages/auth-client/src/storage/storage.interface";
import { ApiClient } from "../../../../../../packages/auth-client/src/api-client";
import { AuthGuard } from "../adapters/http/auth.guard";
import { AuthorizeRequestContextUseCase } from "../application/use-cases/authorize-request-context.usecase";
import { AuthorizeWorkspaceUseCase } from "../../workspaces/public";
import { Membership } from "../domain/entities/membership.entity";
import type { MembershipRepositoryPort } from "../application/ports/membership-repository.port";
import type { WorkspaceRepositoryPort } from "../../workspaces/application/ports/workspace-repository.port";
import type { TokenServicePort } from "../application/ports/token-service.port";

const payload = Buffer.from(JSON.stringify({ exp: 9999999999 })).toString("base64url");
const token = `synthetic.${payload}.signature`;
let tenantId: string | null = "tenant-a";
let available = ["workspace-a", "workspace-a2"];
const selectors: Array<{ path: string; workspace: string | null }> = [];

@Controller()
class BootstrapFixtureController {
  @Post(["auth/signup", "auth/login", "auth/switch-tenant"])
  authenticate() {
    return {
      accessToken: token + "-" + String(tenantId),
      refreshToken: "synthetic",
      userId: "user",
      email: "synthetic@example.invalid",
      tenantId,
    };
  }
  @Get("auth/me")
  @UseGuards(AuthGuard)
  me() {
    return {
      userId: "user",
      email: "synthetic@example.invalid",
      name: null,
      activeTenantId: tenantId,
      memberships: [],
    };
  }
  @Get("workspaces")
  @UseGuards(AuthGuard)
  list() {
    return { workspaces: available.map((id) => ({ id })) };
  }
  @Get("scoped")
  @UseGuards(AuthGuard)
  scoped() {
    return { ok: true };
  }
}

let app: INestApplication;
let active: string | null;
let client: AuthClient;
let storage: TokenStorage;

beforeAll(async () => {
  const members = mockDeep<MembershipRepositoryPort>();
  members.findByTenantAndUser.mockImplementation(async (scope, userId) =>
    Membership.create("membership", scope, userId, "owner-role")
  );
  const repo = mockDeep<WorkspaceRepositoryPort>();
  repo.getWorkspaceById.mockImplementation(async (scope, id) =>
    available.includes(id)
      ? {
          id,
          tenantId: scope,
          name: "Synthetic",
          legalEntityId: "legal",
          onboardingStatus: "NEW",
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      : null
  );
  repo.getMembershipByUserAndWorkspace.mockImplementation(async (workspaceId, userId) =>
    available.includes(workspaceId)
      ? {
          id: "wm",
          workspaceId,
          userId,
          role: "OWNER",
          status: "ACTIVE",
          createdAt: new Date(),
        }
      : null
  );
  const tokens = mockDeep<TokenServicePort>();
  tokens.verifyAccessToken.mockImplementation(async () => ({
    userId: "user",
    tenantId,
    roleIds: ["owner-role"],
    email: "synthetic@example.invalid",
    iat: 0,
    exp: 9999999999,
  }));
  const module = await Test.createTestingModule({ controllers: [BootstrapFixtureController] })
    .overrideGuard(AuthGuard)
    .useValue(
      new AuthGuard(
        tokens,
        new AuthorizeRequestContextUseCase(members, new AuthorizeWorkspaceUseCase(repo))
      )
    )
    .compile();
  app = module.createNestApplication();
  await app.init();
});
beforeEach(async () => {
  tenantId = "tenant-a";
  available = ["workspace-a", "workspace-a2"];
  active = null;
  selectors.length = 0;
  const adapter = mockDeep<TokenStorage>();
  adapter.setActiveWorkspaceId.mockImplementation(async (id) => {
    active = id;
  });
  adapter.getActiveWorkspaceId.mockImplementation(async () => active);
  storage = adapter;
  client = new AuthClient({ apiUrl: "https://synthetic.invalid", storage });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      const path = new URL(url).pathname;
      const headers = new Headers(init.headers);
      selectors.push({ path, workspace: headers.get("x-workspace-id") });
      const server = request(app.getHttpServer());
      const http = init.method === "POST" ? server.post(path) : server.get(path);
      http.set(Object.fromEntries(headers.entries()));
      if (typeof init.body === "string")
        http.send(JSON.parse(init.body) as Record<string, unknown>);
      const response = await http;
      return Response.json(response.body, { status: response.status });
    })
  );
  await client.signin({ email: "synthetic@example.invalid", password: "synthetic" });
});
afterEach(() => vi.unstubAllGlobals());
afterAll(async () => {
  await app?.close();
});

it.each(["signup", "signin"] as const)(
  "bootstraps %s with a real workspace before scoped requests",
  async (action) => {
    await client[action]({ email: "synthetic@example.invalid", password: "synthetic" });
    expect(active).toBeNull();
    expect((await client.getCurrentUser()).activeWorkspaceId).toBe("workspace-a");
    expect(
      selectors
        .filter((call) => ["/auth/me", "/workspaces"].includes(call.path))
        .every((call) => call.workspace === null)
    ).toBe(true);
    const api = new ApiClient({ apiUrl: "https://synthetic.invalid", authClient: client, storage });
    expect(await api.get("/scoped")).toEqual({ ok: true });
    expect(selectors.at(-1)?.workspace).toBe("workspace-a");
  }
);
it.each(["tenant-a", "workspace-revoked", "workspace-another-tenant"])(
  "repairs saved selector %s without sending it to bootstrap endpoints",
  async (stale) => {
    active = stale;
    expect((await client.getCurrentUser()).activeWorkspaceId).toBe("workspace-a");
    expect(active).toBe("workspace-a");
    expect(
      selectors
        .filter((call) => ["/auth/me", "/workspaces"].includes(call.path))
        .every((call) => call.workspace === null)
    ).toBe(true);
  }
);
it("preserves a valid saved selection and recovers after its membership disappears", async () => {
  active = "workspace-a2";
  expect((await client.getCurrentUser()).activeWorkspaceId).toBe("workspace-a2");
  available = ["workspace-a"];
  expect((await client.getCurrentUser()).activeWorkspaceId).toBe("workspace-a");
});
it("switches tenant without treating the new tenant ID as a workspace", async () => {
  active = "workspace-a";
  tenantId = "tenant-b";
  available = ["workspace-b"];
  await client.switchTenant("tenant-b");
  expect(active).toBeNull();
  expect((await client.getCurrentUser()).activeWorkspaceId).toBe("workspace-b");
});
it("allows onboarding with no workspaces and clears saved scope for host accounts", async () => {
  available = [];
  expect((await client.getCurrentUser()).activeWorkspaceId).toBeUndefined();
  expect(active).toBeNull();
  active = "workspace-a";
  tenantId = null;
  selectors.length = 0;
  expect((await client.getCurrentUser()).activeWorkspaceId).toBeUndefined();
  expect(active).toBeNull();
  expect(selectors.some((call) => call.path === "/workspaces")).toBe(false);
});

it.each([200, 403])(
  "discards an old discovery response (%s) when tenant switching replaces its access token",
  async (status) => {
    const realFetch = globalThis.fetch;
    let release: () => void = () => {
      throw new Error("Discovery has not started");
    };
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    let held = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        const response = await realFetch(url, init);
        if (
          url.endsWith("/workspaces") &&
          new Headers(init.headers).get("authorization")?.endsWith("-tenant-a")
        ) {
          held = true;
          await pending;
        }
        return response;
      })
    );
    const profile = client.getCurrentUser();
    await vi.waitFor(() => expect(held).toBe(true));
    tenantId = "tenant-b";
    available = ["workspace-b"];
    await client.switchTenant("tenant-b");
    release();
    expect(await profile).toMatchObject({
      activeTenantId: "tenant-b",
      activeWorkspaceId: "workspace-b",
    });
    expect(active).toBe("workspace-b");
  }
);
