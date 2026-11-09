import { createContext, useContext, useId, useLayoutEffect } from "react";
import type { SessionWorkspaceChoice } from "./workspace-discovery";
import type { SessionWorkspaceScope } from "./workspace-launch";

export interface WorkspaceSessionContextValue {
  workspace: SessionWorkspaceChoice;
  workspaces: SessionWorkspaceChoice[];
  scope: SessionWorkspaceScope;
  selectWorkspace: (workspaceId: string) => void;
  hasUnsavedChanges: boolean;
  pendingWrites: number;
  registerDraft: (key: string, dirty: boolean) => void;
  confirmExternalNavigation: (action: () => void) => void;
}
export const WorkspaceSessionContext = createContext<WorkspaceSessionContextValue | undefined>(
  undefined
);
export const useOptionalWorkspaceSession = () => useContext(WorkspaceSessionContext);
export function useWorkspaceSession() {
  const context = useOptionalWorkspaceSession();
  if (!context) {
    throw new Error("useWorkspaceSession requires WorkspaceSessionProviders");
  }
  return context;
}
/** Register the active form once; the shared data-router boundary guards PUSH and browser history. */
export function useWorkspaceDraftGuard(isDirty: boolean) {
  const { registerDraft } = useWorkspaceSession();
  const id = useId();
  useLayoutEffect(() => {
    registerDraft(id, isDirty);
    return () => registerDraft(id, false);
  }, [registerDraft, id, isDirty]);
}
