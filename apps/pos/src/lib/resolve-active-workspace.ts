import type { ListWorkspacesOutput } from "@corely/contracts";

type WorkspaceLookupClient = {
  get<T>(endpoint: string): Promise<T>;
};

export async function resolveActiveWorkspaceId(
  client: WorkspaceLookupClient,
  currentWorkspaceId: string | null
): Promise<string | null> {
  const result = await client.get<ListWorkspacesOutput>("/workspaces");
  const workspaces = result.workspaces;

  if (workspaces.length === 0) {
    return currentWorkspaceId;
  }

  if (currentWorkspaceId) {
    const matchingWorkspace = workspaces.find((workspace) => workspace.id === currentWorkspaceId);
    if (matchingWorkspace) {
      return matchingWorkspace.id;
    }
  }

  return workspaces[0]?.id ?? null;
}
