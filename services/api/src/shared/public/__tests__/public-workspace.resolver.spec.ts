import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PublicWorkspaceResolver } from "../public-workspace.resolver";

const buildWorkspace = (overrides: Partial<any> = {}) => ({
  id: "ws-1",
  tenantId: "tenant-1",
  slug: "acme",
  publicEnabled: true,
  publicModules: { rentals: true, cms: true },
  ...overrides,
});

describe("PublicWorkspaceResolver", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalBaseDomains = process.env.PUBLIC_WORKSPACE_BASE_DOMAINS;
  const originalQueryFlag = process.env.PUBLIC_WORKSPACE_QUERY_ENABLED;

  let prisma: any;
  let resolver: PublicWorkspaceResolver;

  beforeEach(() => {
    prisma = {
      workspaceDomain: {
        findUnique: vi.fn(),
      },
      workspace: {
        findFirst: vi.fn(),
      },
    };
    resolver = new PublicWorkspaceResolver(prisma);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalBaseDomains === undefined) {
      delete process.env.PUBLIC_WORKSPACE_BASE_DOMAINS;
    } else {
      process.env.PUBLIC_WORKSPACE_BASE_DOMAINS = originalBaseDomains;
    }
    if (originalQueryFlag === undefined) {
      delete process.env.PUBLIC_WORKSPACE_QUERY_ENABLED;
    } else {
      process.env.PUBLIC_WORKSPACE_QUERY_ENABLED = originalQueryFlag;
    }
  });

  it("resolves by custom domain", async () => {
    const workspace = buildWorkspace({ slug: "rentals" });
    prisma.workspaceDomain.findUnique.mockResolvedValue({ domain: "rentals-acme.com", workspace });

    const result = await resolver.resolveFromRequest({
      host: "rentals-acme.com",
      path: "/public/rentals/properties",
      query: {},
    });

    expect(result.workspaceId).toBe(workspace.id);
    expect(result.tenantId).toBe(workspace.tenantId);
    expect(result.workspaceSlug).toBe("rentals");
    expect(result.resolutionMethod).toBe("custom-domain");
  });

  it("resolves by subdomain", async () => {
    process.env.PUBLIC_WORKSPACE_BASE_DOMAINS = "my.corely.one";
    const workspace = buildWorkspace({ slug: "acme" });
    prisma.workspaceDomain.findUnique.mockResolvedValue(null);
    prisma.workspace.findFirst.mockResolvedValue(workspace);

    const result = await resolver.resolveFromRequest({
      host: "acme.my.corely.one",
      path: "/public/cms/posts",
      query: {},
    });

    expect(result.workspaceSlug).toBe("acme");
    expect(result.resolutionMethod).toBe("subdomain");
  });

  it("resolves portal subdomain when included in PUBLIC_WORKSPACE_BASE_DOMAINS", async () => {
    process.env.PUBLIC_WORKSPACE_BASE_DOMAINS = "portal.corely.one,my.corely.one";
    const workspace = buildWorkspace({ slug: "trang-dang-nachhilfe" });
    prisma.workspaceDomain.findUnique.mockResolvedValue(null);
    prisma.workspace.findFirst.mockResolvedValue(workspace);

    const result = await resolver.resolveFromRequest({
      host: "trang-dang-nachhilfe.portal.corely.one",
      path: "/portal/me",
      query: {},
    });

    expect(result.workspaceSlug).toBe("trang-dang-nachhilfe");
    expect(result.resolutionMethod).toBe("subdomain");
  });

  it("resolves my subdomain when included in PUBLIC_WORKSPACE_BASE_DOMAINS", async () => {
    process.env.PUBLIC_WORKSPACE_BASE_DOMAINS = "portal.corely.one,my.corely.one";
    const workspace = buildWorkspace({ slug: "trang-dang-nachhilfe" });
    prisma.workspaceDomain.findUnique.mockResolvedValue(null);
    prisma.workspace.findFirst.mockResolvedValue(workspace);

    const result = await resolver.resolveFromRequest({
      host: "trang-dang-nachhilfe.my.corely.one",
      path: "/public/cms/posts",
      query: {},
    });

    expect(result.workspaceSlug).toBe("trang-dang-nachhilfe");
    expect(result.resolutionMethod).toBe("subdomain");
  });

  it("resolves by path fallback", async () => {
    const workspace = buildWorkspace({ slug: "acme" });
    prisma.workspaceDomain.findUnique.mockResolvedValue(null);
    prisma.workspace.findFirst.mockResolvedValue(workspace);

    const result = await resolver.resolveFromRequest({
      host: "my.corely.one",
      path: "/w/acme/rental/properties",
      query: {},
    });

    expect(result.workspaceSlug).toBe("acme");
    expect(result.resolutionMethod).toBe("path");
  });

  it("resolves by query fallback in dev", async () => {
    process.env.NODE_ENV = "development";
    const workspace = buildWorkspace({ slug: "dev" });
    prisma.workspaceDomain.findUnique.mockResolvedValue(null);
    prisma.workspace.findFirst.mockResolvedValue(workspace);

    const result = await resolver.resolveFromRequest({
      host: "localhost",
      path: "/public/cms/posts",
      query: { w: "dev" },
    });

    expect(result.workspaceSlug).toBe("dev");
    expect(result.resolutionMethod).toBe("query");
  });

  it("rejects query fallback in production", async () => {
    process.env.NODE_ENV = "production";
    prisma.workspaceDomain.findUnique.mockResolvedValue(null);
    prisma.workspace.findFirst.mockResolvedValue(buildWorkspace({ slug: "dev" }));

    await expect(
      resolver.resolveFromRequest({
        host: "localhost",
        path: "/public/cms/posts",
        query: { w: "dev" },
      })
    ).rejects.toMatchObject({ code: "Public:WorkspaceNotResolved" });
  });

  it("prefers host over conflicting path", async () => {
    const hostWorkspace = buildWorkspace({ id: "ws-host", slug: "beta" });
    const pathWorkspace = buildWorkspace({ id: "ws-path", slug: "acme" });
    prisma.workspaceDomain.findUnique.mockResolvedValue(null);
    prisma.workspace.findFirst
      .mockResolvedValueOnce(hostWorkspace)
      .mockResolvedValueOnce(pathWorkspace);

    const result = await resolver.resolveFromRequest({
      host: "beta.my.corely.one",
      path: "/w/acme/rental",
      query: {},
    });

    expect(result.workspaceId).toBe("ws-host");
    expect(result.workspaceSlug).toBe("beta");
    expect(result.resolutionMethod).toBe("subdomain");
  });

  it("returns not found when workspace is missing", async () => {
    prisma.workspaceDomain.findUnique.mockResolvedValue(null);
    prisma.workspace.findFirst.mockResolvedValue(null);

    await expect(
      resolver.resolveFromRequest({
        host: "unknown.my.corely.one",
        path: "/public/rentals",
        query: {},
      })
    ).rejects.toMatchObject({ code: "Public:WorkspaceNotResolved" });
  });

  it("returns not found when host does not match configured base domains", async () => {
    process.env.PUBLIC_WORKSPACE_BASE_DOMAINS = "portal.corely.one,my.corely.one";
    prisma.workspaceDomain.findUnique.mockResolvedValue(null);
    prisma.workspace.findFirst.mockResolvedValue(buildWorkspace({ slug: "acme" }));

    await expect(
      resolver.resolveFromRequest({
        host: "trang-dang-nachhilfe.other.corely.one",
        path: "/portal/me",
        query: {},
      })
    ).rejects.toMatchObject({ code: "Public:WorkspaceNotResolved" });
  });

  it("returns not published when workspace is disabled", async () => {
    const workspace = buildWorkspace({ publicEnabled: false });
    prisma.workspaceDomain.findUnique.mockResolvedValue(null);
    prisma.workspace.findFirst.mockResolvedValue(workspace);

    await expect(
      resolver.resolveFromRequest({
        host: "acme.my.corely.one",
        path: "/public/rentals",
        query: {},
      })
    ).rejects.toMatchObject({ code: "Public:NotPublished" });
  });
});
