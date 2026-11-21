import { ExpenseDetailPage as SharedExpenseDetailPage } from "@corely/web-features/modules/expenses";
import type { ExpenseSubmissionGuidance } from "@corely/expenses-ui";
import { useOptionalWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";

const submissionGuidance: ReadonlyMap<string, ExpenseSubmissionGuidance> = new Map();

export function ExpenseDetailPage() {
  const workspaceId = useOptionalWorkspace()?.activeWorkspace?.id;
  return (
    <SharedExpenseDetailPage
      workspaceId={workspaceId}
      submissionGuidance={workspaceId ? submissionGuidance.get(workspaceId) : undefined}
    />
  );
}
