import { HttpError } from "@corely/api-client";
import { OperationalPackageSchema, type OperationalPackage } from "@corely/contracts";
import { useEffect, useState } from "react";
import { api } from "../../shared/api";

type PackageState =
  | { status: "loading" | "denied" | "error"; workspaceId: string }
  | {
      status: "ready";
      workspaceId: string;
      configuration: OperationalPackage;
      isWorkspaceAdmin: boolean;
    };

export function useOperationalPackage(workspaceId: string | undefined) {
  const [state, setState] = useState<PackageState>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!workspaceId) {
      return;
    }
    const controller = new AbortController();
    setState({ status: "loading", workspaceId });
    const path = "/workspaces/" + encodeURIComponent(workspaceId) + "/config";
    void api
      .request<{
        workspaceId?: unknown;
        operationalPackage?: unknown;
        currentUser?: {
          isWorkspaceAdmin?: unknown;
        };
      }>(
        path + "?scope=web&packageId=internal-operations",
        { headers: { "X-Workspace-Id": workspaceId } },
        { workspaceScope: "none", signal: controller.signal }
      )
      .then((result) => {
        const configuration = OperationalPackageSchema.parse(result.operationalPackage);
        if (result.workspaceId !== workspaceId) {
          throw new Error("The operational package belongs to a different workspace");
        }
        if (!controller.signal.aborted) {
          setState({
            status: "ready",
            workspaceId,
            configuration,
            isWorkspaceAdmin: result.currentUser?.isWorkspaceAdmin === true,
          });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          const denied = error instanceof HttpError && [403, 404].includes(error.status);
          setState({ status: denied ? "denied" : "error", workspaceId });
        }
      });
    return () => controller.abort();
  }, [workspaceId, attempt]);

  return {
    state: state?.workspaceId === workspaceId ? state : undefined,
    retry: () => setAttempt((count) => count + 1),
  };
}
