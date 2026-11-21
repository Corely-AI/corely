import type { TaskCreationGuidance } from "@corely/tasks-ui";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "@corely/web-shared/lib/api-client";
import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";
import { useAuth } from "@corely/web-shared/lib/auth-provider";
import { RecurringChecklists } from "./recurring-checklists";
import { createChecklistsClient } from "./checklists-client";
import { DailyWork } from "./daily-work";
import { createTasksClient } from "./tasks-client";
export function DailyWorkPage({
  templates = false,
  getCreationGuidance,
}: {
  templates?: boolean;
  getCreationGuidance?: (workspaceId: string) => TaskCreationGuidance | undefined;
}) {
  const { activeWorkspaceId } = useWorkspace();
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const client = useMemo(
    () => createTasksClient(apiClient, activeWorkspaceId ?? ""),
    [activeWorkspaceId]
  );
  const checklistClient = useMemo(
    () => createChecklistsClient(apiClient, activeWorkspaceId ?? ""),
    [activeWorkspaceId]
  );
  if (templates) {
    return (
      <RecurringChecklists
        key={JSON.stringify([user?.userId, user?.activeTenantId, activeWorkspaceId])}
        client={checklistClient}
        tasksClient={client}
        locale={i18n.language.split("-")[0]}
      />
    );
  }
  return (
    <DailyWork
      key={JSON.stringify([user?.userId, user?.activeTenantId, activeWorkspaceId])}
      client={client}
      creationGuidance={activeWorkspaceId ? getCreationGuidance?.(activeWorkspaceId) : undefined}
      locale={i18n.language.split("-")[0]}
    />
  );
}
