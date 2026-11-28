import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@corely/ui";
import {
  endTenantAdminSession,
  getTenantAdminSession,
} from "@corely/web-shared/lib/tenant-admin-session";

export function TenantAdminSessionBanner() {
  const { t } = useTranslation();
  const session = getTenantAdminSession();
  const [isEnding, setIsEnding] = useState(false);
  const [hasError, setHasError] = useState(false);
  if (!session) {
    return null;
  }
  const returnToPlatform = async () => {
    setIsEnding(true);
    setHasError(false);
    try {
      await endTenantAdminSession(session);
      window.location.replace("/settings/tenants");
    } catch {
      setHasError(true);
      setIsEnding(false);
    }
  };
  return (
    <aside
      aria-label={t("tenants.adminSessionTitle")}
      className="relative z-50 flex flex-wrap items-center justify-between gap-2 border-b bg-muted px-4 py-2 text-sm"
    >
      <span>{t("tenants.adminSessionBanner", { name: session.tenantName })}</span>
      {hasError ? <span role="alert">{t("tenants.endAdminSessionError")}</span> : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isEnding}
        onClick={() => void returnToPlatform()}
      >
        {t("tenants.returnToPlatform")}
      </Button>
    </aside>
  );
}
