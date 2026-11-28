import type { SsoAppKey } from "@corely/contracts";
import { shellConfig } from "./workspace-config-fixture";
export type FixtureUser = "user-a" | "user-b";
export function fixtureOrigins(port: string) {
  return {
    "app-center": `http://app.localhost:${port}`,
    invoice: `http://invoice.localhost:${port}`,
    hr: `http://hr.localhost:${port}`,
  };
}
export function fixtureApp(host: string): SsoAppKey {
  return host.startsWith("app.") ? "app-center" : host.startsWith("hr.") ? "hr" : "invoice";
}
/** Synthetic transport only, shared by route-mocked browser tests and the explicit local preview. */
export function workspaceFixtureResponse(
  path: string,
  headers: Headers,
  user: FixtureUser,
  app: SsoAppKey,
  origins: ReturnType<typeof fixtureOrigins>
): Response {
  const tenant = headers.get("x-tenant-id");
  const workspace = headers.get("x-workspace-id");
  const tenants = user === "user-a" ? ["tenant-a", "tenant-b"] : ["tenant-b"];
  if (
    tenant &&
    (!tenants.includes(tenant) ||
      (workspace && workspace !== tenant.replace("tenant", "workspace")))
  ) {
    return Response.json({}, { status: 403 });
  }
  if (path === "/api/session/user") {
    return Response.json({
      csrfToken: "a".repeat(43),
      expiresAt: "2099-01-01T00:00:00Z",
      appKey: app,
      user: {
        userId: user,
        name: user === "user-a" ? "Alex Example" : "Blair Example",
        email: `${user}@example.invalid`,
        memberships: tenants.map((id) => ({
          tenantId: id,
          tenantName: id === "tenant-a" ? "Linden team" : "River team",
          roleId: "member",
        })),
      },
    });
  }
  if (path === "/api/bff/workspaces") {
    const id = tenant?.replace("tenant", "workspace");
    return Response.json({
      workspaces: [
        {
          id,
          name: id === "workspace-a" ? "Linden studio" : "River studio",
          legalEntityId: `legal-${id}`,
          kind: "COMPANY",
          onboardingStatus: "DONE",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ],
    });
  }
  if (path.includes("/config?")) {
    const config = shellConfig(app === "hr" ? "hr" : "invoice");
    config.workspaceId = workspace ?? "";
    if (user === "user-b" && app === "hr") {
      config.navigation.groups = [];
    }
    return Response.json(config);
  }
  if (path === "/api/bff/menu/launches") {
    return Response.json(
      (["invoice", "hr"] as const)
        .filter((id) => user !== "user-b" || id !== "hr")
        .map((id) => ({
          appId: id === "invoice" ? "invoices" : "people",
          name: id,
          version: "1",
          tier: 1,
          dependencies: [],
          enabled: true,
          launch: {
            launchId: id,
            surfaceId: "platform",
            displayName: { en: id === "invoice" ? "Invoice" : "HR", de: id, vi: id },
            iconKey: "Users",
            category: id === "invoice" ? "finance" : "people",
            availability: "available",
            url: `${origins[id]}/`,
          },
        }))
    );
  }
  if (["/api/bff/invoices", "/api/bff/people/staff"].includes(path) && workspace) {
    return Response.json({ label: `Records: ${user}/${tenant}/${workspace}` });
  }
  return Response.json({}, { status: 404 });
}
