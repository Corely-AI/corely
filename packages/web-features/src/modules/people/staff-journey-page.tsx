import { usePeopleRuntime } from "./people-runtime";
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiClient } from "@corely/web-shared/lib/api-client";
import { useAuth } from "@corely/web-shared/lib/auth-provider";
import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";
import { createStaffJourneyClient } from "./staff-journey-client";
import { StaffSelfService } from "./staff-self-service";
import { StaffLifecycle } from "./staff-lifecycle";
function LegacyStaffJourneyPage({ manager = false }: { manager?: boolean }) {
  const { activeWorkspaceId } = useWorkspace(),
    { user } = useAuth(),
    { i18n } = useTranslation(),
    { id } = useParams<{ id: string }>();
  const client = useMemo(
    () => createStaffJourneyClient(apiClient, activeWorkspaceId ?? ""),
    [activeWorkspaceId]
  );
  const key = JSON.stringify([user?.userId, user?.activeTenantId, activeWorkspaceId, id, manager]);
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {manager ? (
        <StaffLifecycle
          key={key}
          client={client}
          staffId={id ?? ""}
          locale={i18n.language.split("-")[0]}
        />
      ) : (
        <StaffSelfService key={key} client={client} locale={i18n.language.split("-")[0]} />
      )}
    </div>
  );
}

export function StaffJourneyPage({ manager = false }: { manager?: boolean }) {
  const runtime = usePeopleRuntime();
  const { i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  return runtime ? (
    <div className="p-4 sm:p-6 lg:p-8">
      {manager ? (
        <StaffLifecycle
          key={`${JSON.stringify(runtime.scope)}:${id}`}
          client={runtime.journey}
          staffId={id ?? ""}
          locale={i18n.language.split("-")[0]}
          showTaskLinks={false}
        />
      ) : (
        <StaffSelfService
          key={JSON.stringify(runtime.scope)}
          client={runtime.journey}
          locale={i18n.language.split("-")[0]}
          tasksHref={null}
        />
      )}
    </div>
  ) : (
    <LegacyStaffJourneyPage manager={manager} />
  );
}
