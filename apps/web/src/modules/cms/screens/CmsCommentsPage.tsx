import { PaginationSummary } from "@corely/web-shared/shared/components/pagination-summary";
import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Ban, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@corely/ui";
import { Button } from "@corely/ui";
import { Badge } from "@corely/ui";
import { Input } from "@corely/ui";
import { CrudListPageLayout, useCrudUrlState } from "@/shared/crud";
import { formatDateTime } from "@/shared/lib/formatters";
import { cmsApi } from "@/lib/cms-api";
import type { CmsCommentStatus } from "@corely/contracts";
import { cmsCommentKeys } from "../queries";
import { toast } from "sonner";

const statusOptions = [
  { label: "All statuses", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Spam", value: "SPAM" },
  { label: "Deleted", value: "DELETED" },
];

const statusVariant = (status: string) => {
  switch (status) {
    case "APPROVED":
      return "success";
    case "REJECTED":
    case "DELETED":
      return "danger";
    case "SPAM":
      return "warning";
    default:
      return "muted";
  }
};

export default function CmsCommentsPage() {
  const uiCopy = useUiCopy("ui.cms-cmscommentspage");
  const queryClient = useQueryClient();
  const [listState, setListState] = useCrudUrlState({
    pageSize: 20,
    filters: { status: "PENDING" },
  });
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

  const filters = useMemo(() => listState.filters ?? {}, [listState.filters]);
  const statusFilter = typeof filters.status === "string" ? filters.status : "";
  const postIdFilter = typeof filters.postId === "string" ? filters.postId : "";

  const { data, isLoading, isError, error } = useQuery({
    queryKey: cmsCommentKeys.list({ ...listState, status: statusFilter, postId: postIdFilter }),
    queryFn: () =>
      cmsApi.listComments({
        status: statusFilter ? (statusFilter as CmsCommentStatus) : undefined,
        postId: postIdFilter || undefined,
        page: listState.page,
        pageSize: listState.pageSize,
      }),
  });

  const comments = data?.items ?? [];

  const moderateMutation = useMutation({
    mutationFn: async (params: { commentId: string; status: "APPROVED" | "REJECTED" | "SPAM" }) =>
      cmsApi.moderateComment(params.commentId, params.status),
    onSuccess: async () => {
      toast.success(uiCopy("comment-updated"));
      await queryClient.invalidateQueries({ queryKey: cmsCommentKeys.list() });
      setActiveCommentId(null);
    },
    onError: () => toast.error(uiCopy("failed-to-update-comment")),
  });

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder={uiCopy("filter-by-post-id")}
        className="w-64"
        value={postIdFilter}
        onChange={(event) =>
          setListState({
            filters: { ...filters, postId: event.target.value || undefined },
            page: 1,
          })
        }
      />
      <select
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        value={statusFilter}
        onChange={(event) =>
          setListState({
            filters: { ...filters, status: event.target.value || undefined },
            page: 1,
          })
        }
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {isError ? (
        <div className="text-sm text-destructive">
          {(error as Error)?.message || uiCopy("failed-to-load-comments")}
        </div>
      ) : null}
    </div>
  );

  return (
    <CrudListPageLayout
      title={uiCopy("cms-comments")}
      subtitle="Review reader feedback and moderate submissions"
      toolbar={toolbar}
    >
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              {uiCopy("loading-comments")}
            </div>
          ) : comments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {uiCopy("no-comments-found")}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        {uiCopy("comment")}
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        {uiCopy("reader")}
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        {uiCopy("status")}
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        {uiCopy("created")}
                      </th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {comments.map((comment) => (
                      <tr
                        key={comment.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm">
                          <div className="max-w-xl truncate">{comment.bodyText}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {comment.readerDisplayName || uiCopy("reader")}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant={statusVariant(comment.status)}>{comment.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDateTime(comment.createdAt, "en-US")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={
                                moderateMutation.isPending && activeCommentId === comment.id
                              }
                              onClick={() => {
                                setActiveCommentId(comment.id);
                                moderateMutation.mutate({
                                  commentId: comment.id,
                                  status: "APPROVED",
                                });
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              {uiCopy("approve")}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={
                                moderateMutation.isPending && activeCommentId === comment.id
                              }
                              onClick={() => {
                                setActiveCommentId(comment.id);
                                moderateMutation.mutate({
                                  commentId: comment.id,
                                  status: "REJECTED",
                                });
                              }}
                            >
                              <Ban className="h-4 w-4" />
                              {uiCopy("reject")}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={
                                moderateMutation.isPending && activeCommentId === comment.id
                              }
                              onClick={() => {
                                setActiveCommentId(comment.id);
                                moderateMutation.mutate({ commentId: comment.id, status: "SPAM" });
                              }}
                            >
                              <AlertTriangle className="h-4 w-4" />
                              {uiCopy("spam")}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data?.pageInfo ? (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-muted-foreground">
                  <div>
                    <PaginationSummary page={data.pageInfo.page} total={data.pageInfo.total} />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={listState.page <= 1}
                      onClick={() => setListState({ page: Math.max(1, listState.page - 1) })}
                    >
                      {uiCopy("previous")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!data.pageInfo.hasNextPage}
                      onClick={() => setListState({ page: listState.page + 1 })}
                    >
                      {uiCopy("next")}
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </CrudListPageLayout>
  );
}
