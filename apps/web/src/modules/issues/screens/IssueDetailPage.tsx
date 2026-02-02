import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ArrowLeft, RefreshCw, MessageSquarePlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { issuesApi } from "@/lib/issues-api";
import { buildPublicFileUrl } from "@/lib/rentals-api";
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
  const { t, i18n } = useTranslation();
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
      toast.success(t("issues.status.updated"));
      setStatusSelection("");
    },
    onError: () => toast.error(t("issues.status.updateFailed")),
  });

  const resolveMutation = useMutation({
    mutationFn: () => issuesApi.resolveIssue({ issueId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: issueKeys.detail(issueId) });
      toast.success(t("issues.status.resolved"));
    },
    onError: () => toast.error(t("issues.status.resolveFailed")),
  });

  const reopenMutation = useMutation({
    mutationFn: () => issuesApi.reopenIssue(issueId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: issueKeys.detail(issueId) });
      toast.success(t("issues.status.reopened"));
    },
    onError: () => toast.error(t("issues.status.reopenFailed")),
  });

  const addCommentMutation = useMutation({
    mutationFn: () => issuesApi.addComment({ issueId, body: commentBody }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: issueKeys.detail(issueId) });
      setCommentBody("");
      toast.success(t("issues.comments.added"));
    },
    onError: () => toast.error(t("issues.comments.addFailed")),
  });

  const statusBadge = useMemo(() => {
    if (!issue) {
      return null;
    }
    return <Badge variant="secondary">{t(`issues.statuses.${issue.status}`)}</Badge>;
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
        <p className="text-sm text-destructive">{t("issues.errors.loadFailed")}</p>
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
                {t("issues.createdAt", {
                  date: formatDate(issue.createdAt, i18n.t("common.locale")),
                })}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {issue.status !== "RESOLVED" ? (
            <Button
              variant="accent"
              onClick={() => resolveMutation.mutate()}
              disabled={resolveMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4" />
              {t("issues.actions.resolve")}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => reopenMutation.mutate()}
              disabled={reopenMutation.isPending}
            >
              <RefreshCw className="h-4 w-4" />
              {t("issues.actions.reopen")}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">{t("issues.fields.priority")}</p>
              <p className="text-sm font-medium">
                {t(`issues.priority.${(issue.priority ?? "MEDIUM").toLowerCase()}`)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("issues.fields.site")}</p>
              <p className="text-sm font-medium">
                {issue.siteType ? t(`issues.siteTypes.${issue.siteType.toLowerCase()}`) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("issues.fields.assignee")}</p>
              <p className="text-sm font-medium">
                {issue.assigneeUserId ?? t("issues.unassigned")}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">{t("issues.fields.description")}</p>
            <p className="text-sm whitespace-pre-line">
              {issue.description ?? t("issues.description.empty")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={statusSelection}
              onValueChange={(value) => setStatusSelection(value as IssueStatus)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t("issues.status.change")} />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {t(`issues.statuses.${status}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => statusSelection && changeStatusMutation.mutate(statusSelection)}
              disabled={!statusSelection || changeStatusMutation.isPending}
            >
              {t("issues.status.update")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">{t("issues.comments.addTitle")}</h2>
          <Textarea
            rows={3}
            value={commentBody}
            onChange={(event) => setCommentBody(event.target.value)}
            placeholder={t("issues.comments.placeholder")}
          />
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => addCommentMutation.mutate()}
              disabled={!commentBody.trim() || addCommentMutation.isPending}
            >
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              {t("issues.comments.add")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">{t("issues.comments.title")}</h2>
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("issues.comments.empty")}</p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-md border border-border p-3">
                  <p className="text-sm whitespace-pre-line">{comment.body}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {comment.createdByUserId} •{" "}
                    {formatDate(comment.createdAt, i18n.t("common.locale"))}
                  </p>
                  {comment.attachments?.length ? (
                    <ul className="text-xs text-muted-foreground mt-2 list-disc list-inside">
                      {comment.attachments.map((attachment) => (
                        <li key={attachment.id}>
                          {attachment.kind} • {attachment.mimeType} •{" "}
                          {t("common.bytes", { count: attachment.sizeBytes })}
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
          <h2 className="text-lg font-semibold">{t("issues.attachments.title")}</h2>
          {issue.attachments?.length ? (
            <div className="space-y-4">
              {issue.attachments.some((a) => a.kind === "IMAGE") && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {issue.attachments
                    .filter((a) => a.kind === "IMAGE")
                    .map((attachment) => (
                      <div
                        key={attachment.id}
                        className="group relative aspect-square rounded-md border overflow-hidden bg-muted"
                      >
                        <img
                          src={buildPublicFileUrl(attachment.fileId ?? attachment.documentId)}
                          alt="Attachment"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                </div>
              )}
              {issue.attachments.some((a) => a.kind !== "IMAGE") && (
                <ul className="text-sm text-muted-foreground list-disc list-inside">
                  {issue.attachments
                    .filter((a) => a.kind !== "IMAGE")
                    .map((attachment) => (
                      <li key={attachment.id}>
                        {attachment.kind} • {attachment.mimeType} •{" "}
                        {t("common.bytes", { count: attachment.sizeBytes })}
                        {attachment.transcriptText ? (
                          <span className="block text-xs text-foreground mt-1">
                            {t("issues.attachments.transcript", {
                              transcript: attachment.transcriptText,
                            })}
                          </span>
                        ) : null}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("issues.attachments.empty")}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">{t("issues.activity.title")}</h2>
          {activity.length ? (
            <ul className="space-y-2 text-sm text-muted-foreground">
              {activity.map((item) => (
                <li key={item.id}>
                  {item.type.replace(/_/g, " ")} •{" "}
                  {formatDate(item.createdAt, i18n.t("common.locale"))}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t("issues.activity.empty")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
