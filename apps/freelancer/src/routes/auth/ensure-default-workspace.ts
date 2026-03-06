import { workspacesApi } from "@corely/web-shared/shared/workspaces/workspaces-api";
import { setActiveWorkspaceId } from "@corely/web-shared/shared/workspaces/workspace-store";

const DEFAULT_COUNTRY_CODE = "DE";
const DEFAULT_CURRENCY = "EUR";

function buildWorkspaceName(email?: string): string {
  const localPart = email?.split("@")[0]?.trim();
  if (localPart && localPart.length > 0) {
    return `${localPart}'s Workspace`;
  }
  return "My Freelancer Workspace";
}

export async function ensureDefaultWorkspace(email?: string): Promise<void> {
  const existing = await workspacesApi.listWorkspaces();
  if (existing.length > 0) {
    const selected = existing[0];
    setActiveWorkspaceId(selected.id);
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
