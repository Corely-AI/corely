import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";
import { TenantAdminSessionBanner } from "../platform/screens/tenant-management/tenant-admin-session-banner";
import { LanguageProvider } from "./shared/i18n";
import StudioPage from "./modules/studio/studio-page";
import "./styles.css";

export default function EmbeddedStudio() {
  const { activeWorkspaceId } = useWorkspace();
  return (
    <div className="openbuk-surface openbuk-embedded">
      <TenantAdminSessionBanner />
      <LanguageProvider>
        <StudioPage key={activeWorkspaceId} embedded />
      </LanguageProvider>
    </div>
  );
}
