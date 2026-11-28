import { useOptionalWorkspaceSession } from "@corely/web-shared/session/workspace-session-context";
import {
  useId,
  useLayoutEffect,
  createContext,
  useContext,
  useCallback,
  type ComponentProps,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import type { EffectivePermissionSet } from "@corely/contracts";
import type { SessionWorkspaceScope } from "@corely/web-shared/session/workspace-launch";
import { peopleApi, type PeopleApi } from "./people-api";
import type { StaffJourneyClient } from "./staff-journey-client";
export interface PeopleRuntime {
  api: PeopleApi;
  journey: StaffJourneyClient;
  scope: SessionWorkspaceScope;
  permissions: EffectivePermissionSet;
  route: (path: string) => string;
}
const Context = createContext<PeopleRuntime | undefined>(undefined);
export const PeopleRuntimeProvider = Context.Provider;
export const usePeopleRuntime = () => useContext(Context);
export const usePeopleApi = () => usePeopleRuntime()?.api ?? peopleApi;
export function usePeopleRoute() {
  const runtime = usePeopleRuntime();
  return useCallback((path: string) => (runtime ? runtime.route(path) : path), [runtime]);
}
export function PeopleLink(props: ComponentProps<typeof Link>) {
  const route = usePeopleRoute();
  return <Link {...props} to={typeof props.to === "string" ? route(props.to) : props.to} />;
}
export function usePeopleNavigate() {
  const navigate = useNavigate();
  const route = usePeopleRoute();
  return useCallback((path: string) => navigate(route(path)), [navigate, route]);
}

export function usePeopleDraftGuard(dirty: boolean) {
  const workspace = useOptionalWorkspaceSession();
  const id = useId();
  const register = workspace?.registerDraft;
  useLayoutEffect(() => {
    register?.(id, dirty);
    return () => register?.(id, false);
  }, [register, id, dirty]);
}
