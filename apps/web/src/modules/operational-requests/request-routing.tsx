import type { OperationalRequestRoute, WorkspaceMemberDto } from "@corely/contracts";
import { Button, Card, CardContent, Label, LoadingSkeleton } from "@corely/ui";
import { workspacesApi } from "@corely/web-shared/shared/workspaces/workspaces-api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import type { OperationalRequestsClient } from "./operational-requests-api";
import { kindLabel } from "./request-draft-fields";
import type { RequestsCopy } from "./requests-copy";

export function RequestRouting({
  requestsApi,
  workspaceId,
  scope,
  copy,
}: {
  requestsApi: OperationalRequestsClient;
  workspaceId: string;
  scope: readonly unknown[];
  copy: RequestsCopy;
}) {
  const queryKey = ["operational-requests", ...scope, "routing"];
  const routes = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const [routing, { members }] = await Promise.all([
        requestsApi.routes(signal),
        workspacesApi.listMembers(workspaceId),
      ]);
      return { routing, members: members.filter(({ status }) => status === "ACTIVE") };
    },
    meta: { persist: false },
  });
  const cache = useQueryClient();
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{copy.routeHint}</p>
      {routes.isPending ? (
        <LoadingSkeleton label={copy.load} variant="form" />
      ) : routes.isError ? (
        <div className="space-y-2" role="alert">
          <p>{copy.error}</p>
          <Button variant="outline" onClick={() => void routes.refetch()}>
            {copy.retry}
          </Button>
        </div>
      ) : (
        <Card>
          <CardContent className="grid gap-5 p-4 sm:grid-cols-2 sm:p-6">
            {routes.data.routing.map((route) => (
              <ReviewerField
                requestsApi={requestsApi}
                key={route.kind}
                route={route}
                members={routes.data.members}
                copy={copy}
                saved={(result) => {
                  cache.setQueryData<typeof routes.data>(
                    queryKey,
                    (previous) =>
                      previous && {
                        ...previous,
                        routing: previous.routing.map((current) =>
                          current.kind === result.kind ? result : current
                        ),
                      }
                  );
                }}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReviewerField({
  requestsApi,
  route,
  members,
  copy,
  saved,
}: {
  requestsApi: OperationalRequestsClient;
  route: OperationalRequestRoute;
  members: WorkspaceMemberDto[];
  copy: RequestsCopy;
  saved: (route: OperationalRequestRoute) => void;
}) {
  const [selected, select] = useState(route.reviewerUserId ?? "");
  const lastAttempt = useRef<{ reviewerId: string; key: string } | undefined>(undefined);
  const update = useMutation({
    mutationFn: async (reviewerId: string) => {
      const key =
        lastAttempt.current?.reviewerId === reviewerId
          ? lastAttempt.current.key
          : crypto.randomUUID();
      lastAttempt.current = { key, reviewerId };
      return requestsApi.saveRoute(route.kind, reviewerId, key);
    },
    onSuccess: (value) => {
      lastAttempt.current = undefined;
      saved(value);
    },
  });
  return (
    <div className="space-y-2">
      <Label htmlFor={`reviewer-${route.kind}`}>{kindLabel(route.kind, copy)}</Label>
      <select
        id={`reviewer-${route.kind}`}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-ring"
        value={selected}
        onChange={(event) => {
          select(event.target.value);
          update.reset();
        }}
        disabled={update.isPending}
      >
        <option value="">{copy.member}</option>
        {selected && !members.some((member) => member.userId === selected) && (
          <option value={selected} disabled>
            {copy.invalidReviewer}
          </option>
        )}
        {members.map((member) => (
          <option key={member.userId} value={member.userId}>
            {member.name || member.email || member.userId}
          </option>
        ))}
      </select>
      <Button
        variant="outline"
        disabled={!selected || selected === route.reviewerUserId || update.isPending}
        onClick={() => update.mutate(selected)}
      >
        {copy.setReviewer}
      </Button>
      {update.isError && (
        <p className="text-sm text-destructive" role="alert">
          {copy.invalidReviewer}
        </p>
      )}
      {update.isSuccess && (
        <p className="text-sm" role="status">
          {copy.savedReview}
        </p>
      )}
    </div>
  );
}
