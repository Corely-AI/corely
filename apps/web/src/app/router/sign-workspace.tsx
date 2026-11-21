import React from "react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, EmptyState } from "@corely/ui";
import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";

export function SignWorkspace() {
  const { t } = useTranslation();
  const { activeWorkspace, isLoading, refresh } = useWorkspace();
  const loading = (
    <p role="status" className="p-6 text-muted-foreground">
      {t("common.loading")}
    </p>
  );
  if (!activeWorkspace) {
    if (isLoading) {
      return loading;
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
