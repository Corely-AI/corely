import { setActiveWorkspaceId } from "./workspace-store";
import { workspacesApi } from "./workspaces-api";

const DEFAULT_COUNTRY_CODE = "DE";
const DEFAULT_CURRENCY = "EUR";

function buildWorkspaceName(email?: string): string {
  const localPart = email?.split("@")[0]?.trim();
  if (localPart && localPart.length > 0) {
    return `${localPart}'s Workspace`;
  }
  return "My Workspace";
}

export async function ensureDefaultWorkspace(email?: string): Promise<void> {
  const existing = await workspacesApi.listWorkspaces();
  if (existing.length > 0) {
    setActiveWorkspaceId(existing[0].id);
    return;
  }

  const name = buildWorkspaceName(email);
  const created = await workspacesApi.createWorkspace({
    name,
    kind: "PERSONAL",
    legalName: name,
    countryCode: DEFAULT_COUNTRY_CODE,
    currency: DEFAULT_CURRENCY,
  });
  setActiveWorkspaceId(created.workspace.id);
}
