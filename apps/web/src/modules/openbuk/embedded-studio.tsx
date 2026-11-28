import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";
import { useMemo } from "react";
import { useMatch, useSearchParams } from "react-router-dom";
import { TenantAdminSessionBanner } from "../platform/screens/tenant-management/tenant-admin-session-banner";
import { LanguageProvider } from "./shared/i18n";
import { Loading } from "./shared/ui";
import { OperationsPlanForm } from "./modules/studio/operations-plan-form";
import StudioPage from "./modules/studio/studio-page";
import {
  AppointmentReviewPanel,
  appointmentReviewClient,
  ReviewUnavailable,
} from "./modules/studio/appointment-review";
import "./styles.css";

export default function EmbeddedStudio() {
  const { activeWorkspaceId, setWorkspace } = useWorkspace();
  const review = useMatch("/openbuk/app/reviews/:id");
  const reviewId = review?.params.id;
  return (
    <div className="openbuk-surface openbuk-embedded">
      <TenantAdminSessionBanner />
      <LanguageProvider>
        {reviewId ? (
          <AppointmentReviewScreen id={reviewId} />
        ) : (
          <StudioPage
            key={activeWorkspaceId}
            embedded
            onWorkspaceSaved={(workspace) => setWorkspace(workspace.id, workspace)}
          />
        )}
      </LanguageProvider>
    </div>
  );
}

function AppointmentReviewScreen({ id }: { id: string }) {
  const [params] = useSearchParams();
  const { activeWorkspaceId, workspaces, isLoading } = useWorkspace();
  const workspace = workspaces.find(
    (entry) => entry.id === (params.get("workspaceId") ?? activeWorkspaceId)
  );
  const client = useMemo(
    () => (workspace ? appointmentReviewClient(id, workspace.id) : null),
    [id, workspace]
  );
  if (isLoading) {
    return <Loading />;
  }
  if (id === "new" && workspace) {
    return <OperationsPlanForm key={workspace.id} workspaceId={workspace.id} />;
  }
  return workspace && client ? (
    <AppointmentReviewPanel
      key={`${workspace.id}/${id}`}
      client={client}
      workspaceName={workspace.name}
    />
  ) : (
    <ReviewUnavailable />
  );
}
