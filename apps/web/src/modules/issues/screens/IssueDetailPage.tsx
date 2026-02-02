import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ArrowLeft, RefreshCw, MessageSquarePlus } from "lucide-react";
import { issuesApi } from "@/lib/issues-api";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import { Textarea } from "@/shared/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { formatDate } from "@/shared/lib/formatters";
import { issueKeys } from "../queries";
import type { IssueStatus } from "@corely/contracts";

const STATUS_OPTIONS: IssueStatus[] = [
  "NEW",
  "TRIAGED",
  "IN_PROGRESS",
  "WAITING",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
];

export default function IssueDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [commentBody, setCommentBody] = useState("");
  const [statusSelection, setStatusSelection] = useState<IssueStatus | "">("");

  const issueId = id ?? "";

  const { data, isLoading, isError } = useQuery({
    queryKey: issueKeys.detail(issueId),
    queryFn: () => issuesApi.getIssue(issueId),
    enabled: Boolean(issueId),
  });

  const issue = data?.issue;
  const comments = data?.comments ?? [];
  const activity = data?.activity ?? [];

  const changeStatusMutation = useMutation({
    mutationFn: (status: IssueStatus) => issuesApi.changeStatus({ issueId, status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: issueKeys.detail(issueId) });
      toast.success("Status updated");
      setStatusSelection("");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const resolveMutation = useMutation({
    mutationFn: () => issuesApi.resolveIssue({ issueId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: issueKeys.detail(issueId) });
      toast.success("Issue resolved");
    },
    onError: () => toast.error("Failed to resolve issue"),
  });

  const reopenMutation = useMutation({
    mutationFn: () => issuesApi.reopenIssue(issueId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: issueKeys.detail(issueId) });
      toast.success("Issue reopened");
    },
    onError: () => toast.error("Failed to reopen issue"),
  });

  const addCommentMutation = useMutation({
    mutationFn: () => issuesApi.addComment({ issueId, body: commentBody }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: issueKeys.detail(issueId) });
      setCommentBody("");
      toast.success("Comment added");
    },
    onError: () => toast.error("Failed to add comment"),
  });

  const statusBadge = useMemo(() => {
    if (!issue) {
      return null;
    }
    return <Badge variant="secondary">{issue.status.replace(/_/g, " ")}</Badge>;
  }, [issue]);

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="h-8 w-64 animate-pulse rounded bg-muted/20" />
      </div>
    );
  }

  if (isError || !issue) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-sm text-destructive">Failed to load issue.</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/issues")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-h1 text-foreground">{issue.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              {statusBadge}
              <span className="text-xs text-muted-foreground">
                Created {formatDate(issue.createdAt, "en-US")}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => addCommentMutation.mutate()}
            disabled={!commentBody.trim() || addCommentMutation.isPending}
          >
            <MessageSquarePlus className="h-4 w-4" />
            Add comment
          </Button>
          {issue.status !== "RESOLVED" ? (
            <Button
              variant="accent"
              onClick={() => resolveMutation.mutate()}
              disabled={resolveMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4" />
              Resolve
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => reopenMutation.mutate()}
              disabled={reopenMutation.isPending}
            >
              <RefreshCw className="h-4 w-4" />
              Reopen
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Priority</p>
              <p className="text-sm font-medium">{issue.priority ?? "MEDIUM"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Site</p>
              <p className="text-sm font-medium">{issue.siteType}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Assignee</p>
              <p className="text-sm font-medium">{issue.assigneeUserId ?? "Unassigned"}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Description</p>
            <p className="text-sm whitespace-pre-line">
              {issue.description ?? "No description provided."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={statusSelection}
              onValueChange={(value) => setStatusSelection(value as IssueStatus)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Change status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => statusSelection && changeStatusMutation.mutate(statusSelection)}
              disabled={!statusSelection || changeStatusMutation.isPending}
            >
              Update status
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Add comment</h2>
          <Textarea
            rows={3}
            value={commentBody}
            onChange={(event) => setCommentBody(event.target.value)}
            placeholder="Add details or updates"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Comments</h2>
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-md border border-border p-3">
                  <p className="text-sm whitespace-pre-line">{comment.body}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {comment.createdByUserId} • {formatDate(comment.createdAt, "en-US")}
                  </p>
                  {comment.attachments?.length ? (
                    <ul className="text-xs text-muted-foreground mt-2 list-disc list-inside">
                      {comment.attachments.map((attachment) => (
                        <li key={attachment.id}>
                          {attachment.kind} • {attachment.mimeType} • {attachment.sizeBytes} bytes
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Attachments</h2>
          {issue.attachments?.length ? (
            <ul className="text-sm text-muted-foreground list-disc list-inside">
              {issue.attachments.map((attachment) => (
                <li key={attachment.id}>
                  {attachment.kind} • {attachment.mimeType} • {attachment.sizeBytes} bytes
                  {attachment.transcriptText ? (
                    <span className="block text-xs text-foreground mt-1">
                      Transcript: {attachment.transcriptText}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No attachments.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Activity</h2>
          {activity.length ? (
            <ul className="space-y-2 text-sm text-muted-foreground">
              {activity.map((item) => (
                <li key={item.id}>
                  {item.type.replace(/_/g, " ")} • {formatDate(item.createdAt, "en-US")}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
