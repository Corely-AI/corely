import type { BrowserContext } from "@playwright/test";
import { StaffProfileSchema, StaffSelfViewSchema } from "@corely/contracts";
import {
  workspaceFixtureResponse,
  fixtureOrigins,
} from "../../../../packages/web-shared/testkit/workspace-api-fixture";
export async function hrTransport(
  context: BrowserContext,
  options: { manager?: boolean; denied?: boolean; empty?: boolean; fail?: boolean } = {}
) {
  const requests: string[] = [];
  const commands: Array<{ path: string; headers: Record<string, string>; body: unknown }> = [];
  let profile = StaffProfileSchema.parse({
    id: "anna",
    workspaceId: "workspace-a",
    displayName: "Anna Example",
    jobTitle: "Stylist",
    team: "Linden",
    version: 1,
    archivedAt: null,
    createdAt: "2026-11-09T10:00:00Z",
    updatedAt: "2026-11-09T10:00:00Z",
  });
  await context.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const headers = await request.allHeaders();
    requests.push(path);
    if (path.startsWith("/api/bff/people") || path === "/api/bff/identity/permissions/effective") {
      if (headers["x-workspace-id"] !== "workspace-a" || headers["x-tenant-id"] !== "tenant-a") {
        await route.fulfill({ status: 403, json: {} });
        return;
      }
      if (path.endsWith("permissions/effective")) {
        await route.fulfill({
          json: {
            permissions: {
              allowAll: false,
              allowed: options.denied
                ? []
                : [
                    "people.directory.read",
                    "people.self.read",
                    "people.self.update",
                    ...(options.manager ? ["people.profile.manage"] : []),
                    ...(options.private ? ["people.private.read"] : []),
                  ],
              denied: [],
            },
          },
        });
        return;
      }
      if (options.fail) {
        await route.fulfill({ status: 500, json: {} });
        return;
      }
      if (path.includes("missing")) {
        await route.fulfill({ status: 404, json: {} });
        return;
      }
      if (request.method() !== "GET") {
        const body: unknown = request.postDataJSON();
        commands.push({ path, body, headers });
        if (
          typeof body === "object" &&
          body &&
          "displayName" in body &&
          typeof body.displayName === "string"
        ) {
          profile = { ...profile, displayName: body.displayName, version: 2 };
        }
      }
      const { accountId, partyId, ...neutral } = profile;
      const self = StaffSelfViewSchema.parse({
        profile: neutral,
        canEdit: true,
        contacts: { personalEmail: null, personalPhone: null, version: 0 },
        availability: { version: 0, plans: [] },
        onboardingTask: null,
        tasksAvailable: false,
      });
      const json = path.endsWith("/private")
        ? {
            version: 1,
            notes: "Synthetic398 confidential note",
            personalEmail: null,
            personalPhone: null,
          }
        : path.endsWith("/absences")
          ? { items: [] }
          : path === "/api/bff/people/me"
            ? self
            : path.endsWith("/availability")
              ? {
                  version: 0,
                  plans: [],
                  profileVersion: 1,
                  resourceId: null,
                  evaluatedAt: "2026-11-09T10:00:00Z",
                  affectedCommitments: [],
                }
              : path === "/api/bff/people/staff" && request.method() === "GET"
                ? {
                    items: options.empty ? [] : [neutral],
                    total: options.empty ? 0 : 1,
                    page: 1,
                    pageSize: 25,
                  }
                : path.endsWith("/management")
                  ? profile
                  : neutral;
      await route.fulfill({ json });
      return;
    }
    const response = workspaceFixtureResponse(
      path + url.search,
      new Headers(headers),
      options.user ?? "user-a",
      "hr",
      fixtureOrigins("5189")
    );
    await route.fulfill({ status: response.status, json: await response.json() });
  });
  return { requests, commands };
}
