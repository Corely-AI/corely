import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@corely/web-shared/lib/auth-provider";
import { useEffectivePermissions, hasPermission } from "@corely/web-shared/shared/lib/permissions";
import { peopleCopy } from "./people-copy";

export function usePeopleAccess() {
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspace();
  const { i18n } = useTranslation();
  const permissions = useEffectivePermissions();
  const locale = i18n.language.split("-")[0];
  return {
    locale,
    scope: JSON.stringify([user?.userId, user?.activeTenantId, activeWorkspaceId]),
    copy: peopleCopy[locale === "de" || locale === "vi" ? locale : "en"],
    loading: permissions.isLoading,
    can: (key: string) => hasPermission(permissions.data?.permissions, `people.${key}`),
  };
}
// Personnel responses stay in mounted component memory, outside persisted query caches.
export function usePeopleLoad<T>(
  load: (signal: AbortSignal) => Promise<T>,
  key: string,
  enabled = true
) {
  const [state, setState] = useState<{ key: string; data?: T; error?: boolean; loading: boolean }>({
    key,
    loading: true,
  });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ key, loading: true });
    if (enabled) {
      void load(controller.signal)
        .then((data) => {
          if (!controller.signal.aborted) {
            setState({ key, data, loading: false });
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setState({ key, error: true, loading: false });
          }
        });
    }
    return () => controller.abort();
    // key explicitly identifies scope, record, filters and permitted projection.
  }, [key, enabled, revision]);
  return {
    ...(state.key === key
      ? state
      : { key, data: undefined as T | undefined, error: false, loading: true }),
    reload: () => setRevision((r) => r + 1),
  };
}

export function usePeopleMounted(identity = "") {
  // Each routed operation keeps its original lifetime, even when React reuses
  // the component for another staff ID or the user navigates away and back.
  const mounted = useMemo(() => ({ current: true }), [identity]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, [mounted]);
  return mounted;
}
