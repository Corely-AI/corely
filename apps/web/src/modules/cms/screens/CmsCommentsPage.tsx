import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Ban, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
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
      toast.success("Comment updated");
      await queryClient.invalidateQueries({ queryKey: cmsCommentKeys.list() });
      setActiveCommentId(null);
    },
    onError: () => toast.error("Failed to update comment"),
  });

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Filter by post ID"
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
          {(error as Error)?.message || "Failed to load comments"}
        </div>
      ) : null}
    </div>
  );

  return (
    <CrudListPageLayout
      title="CMS Comments"
      subtitle="Review reader feedback and moderate submissions"
      toolbar={toolbar}
    >
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading comments...</div>
          ) : comments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No comments found.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        Comment
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        Reader
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        Status
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        Created
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
                          {comment.readerDisplayName || "Reader"}
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
                              Approve
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
                              Reject
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
                              Spam
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
                    Page {data.pageInfo.page} · {data.pageInfo.total} total
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={listState.page <= 1}
                      onClick={() => setListState({ page: Math.max(1, listState.page - 1) })}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!data.pageInfo.hasNextPage}
                      onClick={() => setListState({ page: listState.page + 1 })}
                    >
                      Next
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
