import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";
import { LanguageProvider } from "./shared/i18n";
import StudioPage from "./modules/studio/studio-page";
import "./styles.css";

export default function EmbeddedStudio() {
  const { activeWorkspaceId } = useWorkspace();
  return (
    <div className="openbuk-surface openbuk-embedded">
      <LanguageProvider>
        <StudioPage key={activeWorkspaceId} embedded />
      </LanguageProvider>
    </div>
  );
}
