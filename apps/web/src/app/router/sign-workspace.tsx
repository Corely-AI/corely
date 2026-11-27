import React from "react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, EmptyState } from "@corely/ui";
import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";
import { PageLoadingSkeleton } from "@corely/web-shared/shared/components/page-loading-skeleton";

export function SignWorkspace() {
  const { t } = useTranslation();
  const { activeWorkspace, isLoading, refresh } = useWorkspace();
  if (!activeWorkspace) {
    if (isLoading) {
      return <PageLoadingSkeleton />;
    }
    return (
      <EmptyState
        title={t("sign.workspaceRequired")}
        action={
          <Button variant="outline" onClick={() => void refresh()}>
            {t("sign.retry")}
          </Button>
        }
      />
    );
  }
  return <Outlet />;
}
