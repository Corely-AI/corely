import {
  OpenBukAgendaSchema,
  type OpenBukAgenda,
  type OpenBukAgendaQuery,
} from "@corely/contracts";
import { useEffect, useState } from "react";
import { api } from "../../shared/api";

export function agendaErrorStatus(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error ? error.status : null;
}

export function agendaCommand<T>(workspaceId: string, path: string, body: unknown, key?: string) {
  return api.request<T>(
    `/openbuk/${path}`,
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json", "X-Workspace-Id": workspaceId },
    },
    {
      workspaceScope: "none",
      idempotencyKey: key,
    }
  );
}

type FetchState = {
  query: string;
  data?: OpenBukAgenda;
  dataQuery?: string;
  phase: "loading" | "ready" | "error" | "denied";
};

export function useAgenda(workspaceId: string, query: OpenBukAgendaQuery) {
  const params = new URLSearchParams({ day: query.day, span: query.span });
  if (query.serviceId && query.staffId) {
    params.set("serviceId", query.serviceId);
    params.set("staffId", query.staffId);
  }
  const request = params.toString();
  const [state, setState] = useState<FetchState>({ query: request, phase: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState((old) => ({ ...old, query: request, phase: "loading" }));
    void api
      .request<unknown>(
        `/openbuk/agenda?${request}`,
        { headers: { "X-Workspace-Id": workspaceId } },
        { workspaceScope: "none", signal: controller.signal }
      )
      .then((response) => {
        if (!controller.signal.aborted) {
          setState({
            query: request,
            dataQuery: request,
            phase: "ready",
            data: OpenBukAgendaSchema.parse(response),
          });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          const status = agendaErrorStatus(error);
          const denied = status === 401 || status === 403;
          setState((old) =>
            denied
              ? { query: request, phase: "denied" }
              : { ...old, query: request, phase: "error" }
          );
        }
      });
    return () => controller.abort();
  }, [request, workspaceId, attempt]);
  return {
    phase: state.query === request ? state.phase : "loading",
    data: state.data,
    dataMatchesQuery: state.dataQuery === request,
    refresh: () => setAttempt((count) => count + 1),
  };
}

export function offsetAgendaDay(day: string, offset: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
}
