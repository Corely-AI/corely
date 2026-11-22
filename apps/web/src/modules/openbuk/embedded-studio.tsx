import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";
import { useMemo } from "react";
import { useMatch, useSearchParams } from "react-router-dom";
import { LanguageProvider } from "./shared/i18n";
import { Loading } from "./shared/ui";
import StudioPage from "./modules/studio/studio-page";
import {
  AppointmentReviewPanel,
  appointmentReviewClient,
  ReviewUnavailable,
} from "./modules/studio/appointment-review";
import "./styles.css";

export default function EmbeddedStudio() {
  const { activeWorkspaceId } = useWorkspace();
  const review = useMatch("/openbuk/app/reviews/:id");
  const reviewId = review?.params.id;
  return (
    <div className="openbuk-surface openbuk-embedded">
      <LanguageProvider>
        {reviewId ? (
          <AppointmentReviewScreen id={reviewId} />
        ) : (
          <StudioPage key={activeWorkspaceId} embedded />
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
