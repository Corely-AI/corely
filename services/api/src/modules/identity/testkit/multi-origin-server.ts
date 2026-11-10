// Local test entry point only; no production module imports this fixture.
import "reflect-metadata";
import { readFileSync, writeFileSync, realpathSync } from "node:fs";
import { resolve, relative, isAbsolute, basename } from "node:path";
import { tmpdir } from "node:os";
import { createServer, type Server } from "node:https";
import { createServer as createProxy } from "node:http";
import { connect, type Socket } from "node:net";
import { Test } from "@nestjs/testing";
import { Controller, Get, Inject, Req, UseGuards } from "@nestjs/common";
import { static as staticFiles, type Request, type Response, type NextFunction } from "express";
import { AuthGuard } from "../adapters/http/auth.guard";
import { RbacGuard } from "../adapters/http/rbac.guard";
import { SsoController } from "../adapters/http/sso.controller";
import { SsoHttpSecurity } from "../adapters/http/sso-http-security";
import { configureSsoSessionTransport } from "../adapters/http/sso-session-transport";
import { configureSsoHttpTransport } from "../adapters/http/sso-http-transport";
import { getSsoSessionPrincipal } from "../adapters/http/sso-session-principal";
import { SsoService } from "../application/services/sso.service";
import { SsoSessionService } from "../application/services/sso-session.service";
import { SsoEmailCodeService } from "../application/services/sso-email-code.service";
import { AuthorizeRequestContextUseCase } from "../application/use-cases/authorize-request-context.usecase";
import { GetEffectivePermissionsUseCase } from "../application/use-cases/get-effective-permissions.usecase";
import { ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN } from "../application/ports/role-permission-grant-repository.port";
import { TOKEN_SERVICE_TOKEN } from "../application/ports/token-service.port";
import { toUseCaseContext, type ContextAwareRequest } from "../../../shared/request-context";
import { DomainExceptionFilter } from "../../../shared/filters/domain-exception.filter";
import { MenuController } from "../../platform/adapters/http/menu.controller";
import { WorkspaceConfigController } from "../../platform/adapters/http/workspace-config.controller";
import { ComposeMenuUseCase } from "../../platform/application/use-cases/compose-menu.usecase";
import { GetWorkspaceConfigUseCase } from "../../platform/application/use-cases/get-workspace-config.usecase";
import { ListAppLaunchesUseCase } from "../../platform/application/use-cases/list-app-launches.usecase";
import { GetAppManagementLinkUseCase } from "../../platform/application/use-cases/get-app-management-link.usecase";
import { UpdateMenuOverridesUseCase } from "../../platform/application/use-cases/update-menu-overrides.usecase";
import { ResetMenuOverridesUseCase } from "../../platform/application/use-cases/reset-menu-overrides.usecase";
import { TenantEntitlementService } from "../../platform/application/services/tenant-entitlement.service";
import { EntitlementGuard } from "../../platform/guards/entitlement.guard";
import { ListWorkspacesUseCase } from "../../workspaces/application/use-cases/list-workspaces.usecase";
import { InvoicesHttpController } from "../../invoices/adapters/http/invoices.controller";
import { InvoicesApplication } from "../../invoices/application/invoices.application";
import {
  createMultiOriginFixture,
  multiOriginHosts,
  multiOriginOrigins,
} from "./multi-origin-fixture";

const directory = process.env.SSO_TEST_OUTPUT_DIR;
if (process.env.NODE_ENV !== "test" || !directory) {
  throw new Error("Disposable test fixture required");
}
const actual = realpathSync(directory);
const local = relative(realpathSync(tmpdir()), actual);
if (
  !local ||
  local.startsWith("..") ||
  isAbsolute(local) ||
  !basename(actual).startsWith("corely-401-")
) {
  throw new Error("Refusing non-test-owned temporary directory");
}
const fixture = await createMultiOriginFixture();
const security = new SsoHttpSecurity(fixture.first.registrations, fixture.first.crypto);
const controlSecret = fixture.first.crypto.secret();
@Controller("workspaces")
@UseGuards(AuthGuard)
class FixtureWorkspacesController {
  constructor(@Inject(ListWorkspacesUseCase) private readonly list: ListWorkspacesUseCase) {}
  @Get()
  get(@Req() req: Request) {
    const ctx = toUseCaseContext(req as ContextAwareRequest);
    if (!ctx.tenantId || !ctx.userId) {
      throw new Error("Authenticated workspace context required");
    }
    return this.list.execute({ tenantId: ctx.tenantId, userId: ctx.userId });
  }
}
const module = await Test.createTestingModule({
  controllers: [
    SsoController,
    FixtureWorkspacesController,
    MenuController,
    WorkspaceConfigController,
    InvoicesHttpController,
  ],
  providers: [
    AuthGuard,
    RbacGuard,
    EntitlementGuard,
    { provide: TOKEN_SERVICE_TOKEN, useValue: { verifyAccessToken: async () => null } },
    { provide: SsoService, useValue: fixture.first.service },
    { provide: SsoSessionService, useValue: fixture.sessions },
    { provide: SsoEmailCodeService, useValue: fixture.first.emailCodes },
    { provide: SsoHttpSecurity, useValue: security },
    { provide: AuthorizeRequestContextUseCase, useValue: fixture.authorize },
    { provide: GetEffectivePermissionsUseCase, useValue: fixture.permissions },
    { provide: ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN, useValue: fixture.grants },
    { provide: TenantEntitlementService, useValue: fixture.entitlements },
    { provide: ListWorkspacesUseCase, useValue: fixture.listWorkspaces },
    { provide: ComposeMenuUseCase, useValue: fixture.menus },
    { provide: GetWorkspaceConfigUseCase, useValue: fixture.config },
    { provide: ListAppLaunchesUseCase, useValue: fixture.launches },
    { provide: GetAppManagementLinkUseCase, useValue: fixture.management },
    { provide: UpdateMenuOverridesUseCase, useValue: {} },
    { provide: ResetMenuOverridesUseCase, useValue: {} },
    { provide: InvoicesApplication, useValue: fixture.invoices },
  ],
}).compile();
const app = module.createNestApplication({ logger: false, bodyParser: false });
configureSsoSessionTransport(app);
configureSsoHttpTransport(app);
app.useGlobalFilters(new DomainExceptionFilter());
app.use(async (req: Request, res: Response, next: NextFunction) => {
  if (req.path !== "/__fixture/control") {
    return next();
  }
  if (
    req.method !== "POST" ||
    !fixture.first.crypto.equal(String(req.headers["x-fixture-control"] ?? ""), controlSecret)
  ) {
    return res.status(404).end();
  }
  res.setHeader("Cache-Control", "no-store");
  const actions = {
    reset: fixture.reset,
    expire: fixture.expire,
    revoke: fixture.revoke,
    deny: fixture.deny,
    snapshot: fixture.snapshot,
  };
  const action = req.query.action;
  if (typeof action !== "string" || !Object.hasOwn(actions, action)) {
    return res.status(400).end();
  }
  const result = await actions[action as keyof typeof actions]();
  res.json(action === "snapshot" ? result : { ok: true });
});
app.use((req: Request, res: Response, next: NextFunction) => {
  if (/^\/(?:api|sso|auth)(?:\/|$)/.test(req.path) || getSsoSessionPrincipal(req)) {
    return next();
  }
  try {
    const central = req.headers.host === new URL(multiOriginOrigins.login).host;
    const origin = security.origin(req, central);
    const surface = central ? "login" : security.appKey(origin);
    if (
      surface === "hr" ||
      (central && req.path !== "/login" && !req.path.startsWith("/assets/"))
    ) {
      return next();
    }
    const assets = resolve(actual, surface === "app-center" ? "app-center" : surface);
    security.headers(res);
    staticFiles(assets)(req, res, () => res.sendFile(resolve(assets, "index.html")));
  } catch {
    res.status(404).end();
  }
});
await app.init();
const tls = {
  key: readFileSync(resolve(actual, "key.pem")),
  cert: readFileSync(resolve(actual, "cert.pem")),
};
const servers: Server[] = [];
for (const host of Object.values(multiOriginHosts)) {
  const server = createServer(tls, app.getHttpAdapter().getInstance());
  servers.push(server);
  await new Promise<void>((ready, reject) => {
    server.once("error", reject);
    server.listen(8444, host, ready);
  });
}
// CONNECT preserves browser TLS, host cookies and same-site semantics without OS DNS edits.
// Only these four test endpoints are reachable; this is never a general-purpose proxy.
const tunnels = new Set<Socket>();
const proxy = createProxy((_req, res) => {
  res.writeHead(403);
  res.end();
});
proxy.on("connect", (req, socket, head) => {
  const target = Object.entries(multiOriginOrigins).find(
    ([, origin]) => new URL(origin).host === req.url
  );
  if (!target) {
    socket.end("HTTP/1.1 403 Forbidden\r\n\r\n");
    return;
  }
  const upstream = connect(8444, multiOriginHosts[target[0] as keyof typeof multiOriginHosts]);
  tunnels.add(upstream);
  upstream.on("error", () => socket.destroy());
  upstream.on("close", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
  socket.on("close", () => {
    upstream.destroy();
    tunnels.delete(upstream);
  });
  upstream.on("connect", () => {
    socket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    if (head.length) {
      upstream.write(head);
    }
    socket.pipe(upstream);
    upstream.pipe(socket);
  });
});
await new Promise<void>((ready, reject) => {
  proxy.once("error", reject);
  proxy.listen(8445, "127.0.0.1", ready);
});
writeFileSync(
  resolve(actual, "fixture.json"),
  JSON.stringify({
    origins: multiOriginOrigins,
    email: fixture.first.email,
    secondEmail: fixture.second.email,
    workspaceIds: fixture.workspaceIds,
    invoiceIds: fixture.invoiceIds,
    tenantIds: [fixture.first.tenantId, fixture.second.tenantId],
    controlSecret,
  })
);
process.send?.({ type: "ready" });
let closing = false;
async function close() {
  if (closing) {
    return;
  }
  closing = true;
  for (const tunnel of tunnels) {
    tunnel.destroy();
  }
  await new Promise<void>((done) => proxy.close(() => done()));
  await Promise.all(
    servers.map(
      (server) =>
        new Promise<void>((done) => {
          server.closeAllConnections();
          server.close(() => done());
        })
    )
  );
  await app.close();
  await fixture.cleanup();
  process.send?.({ type: "closed" });
  process.disconnect?.();
}
process.on("message", (message: unknown) => {
  if (message && typeof message === "object" && "type" in message && message.type === "close") {
    void close();
  }
});
process.on("SIGINT", () => {
  void close();
});
process.on("SIGTERM", () => {
  void close();
});
