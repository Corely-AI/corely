import type { ListWorkspacesOutput } from "@corely/contracts";

type WorkspaceLookupClient = {
  get<T>(endpoint: string, opts?: { workspaceScope?: "active" | "none" }): Promise<T>;
};

export async function resolveActiveWorkspaceId(
  client: WorkspaceLookupClient,
  currentWorkspaceId: string | null
): Promise<string | null> {
  const result = await client.get<ListWorkspacesOutput>("/workspaces", {
    workspaceScope: "none",
  });
  const workspaces = result.workspaces;

  if (workspaces.length === 0) {
    return null;
  }

  if (currentWorkspaceId) {
    const matchingWorkspace = workspaces.find((workspace) => workspace.id === currentWorkspaceId);
    if (matchingWorkspace) {
      return matchingWorkspace.id;
    }
  }

  return workspaces[0]?.id ?? null;
}
