import { ListWorkspacesOutputSchema, type SsoAppKey, type SsoSessionUser } from "@corely/contracts";
import { SessionClient } from "./session-client";

export interface SessionWorkspaceChoice {
  id: string;
  name: string;
  tenantId: string;
  tenantName: string;
}
/** Reuse the workspace owner's membership-filtered list. Tenant IDs come from server profile data. */
export async function discoverSessionWorkspaces(
  session: SsoSessionUser,
  appKey: SsoAppKey,
  fetchFn: typeof fetch,
  signal: AbortSignal
): Promise<SessionWorkspaceChoice[]> {
  const choices: SessionWorkspaceChoice[] = [];
  const tenants = new Map(
    session.user.memberships.map((member) => [member.tenantId, member.tenantName])
  );
  for (const [tenantId, tenantName] of tenants) {
    const client = new SessionClient({ appKey, tenantId }, fetchFn);
    const abort = () => client.dispose();
    signal.addEventListener("abort", abort, { once: true });
    try {
      if (signal.aborted) {
        throw new DOMException("Discovery cancelled", "AbortError");
      }
      const identity = await client.bootstrap();
      if (identity.user.userId !== session.user.userId) {
        throw new Error("Account changed during workspace discovery");
      }
      const result = await client.json("/workspaces", ListWorkspacesOutputSchema, { signal });
      for (const workspace of result.workspaces) {
        choices.push({ id: workspace.id, name: workspace.name, tenantId, tenantName });
      }
    } finally {
      signal.removeEventListener("abort", abort);
      client.dispose();
    }
  }
  return choices;
}
