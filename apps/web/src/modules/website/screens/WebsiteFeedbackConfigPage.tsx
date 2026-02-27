import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MessageSquare, Save, Trash2, Pencil } from "lucide-react";
import { Badge, Button, Card, CardContent, Input, Label, Textarea } from "@corely/ui";
import { toast } from "sonner";
import { websiteApi } from "@/lib/website-api";
import type { WebsiteQa } from "@corely/contracts";

type QaFormState = {
  locale: string;
  scope: "site" | "page";
  pageId: string;
  status: "draft" | "published";
  order: number;
  question: string;
  answerHtml: string;
};

const DEFAULT_FORM: QaFormState = {
  locale: "en-US",
  scope: "site",
  pageId: "",
  status: "published",
  order: 0,
  question: "",
  answerHtml: "",
};

export default function WebsiteFeedbackConfigPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [filterLocale, setFilterLocale] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<"all" | "draft" | "published">("all");
  const [form, setForm] = useState<QaFormState>(DEFAULT_FORM);
  const [editingQaId, setEditingQaId] = useState<string | null>(null);

  const qaQueryKey = useMemo(
    () => ["website-qa", siteId, filterLocale, filterStatus],
    [siteId, filterLocale, filterStatus]
  );

  const siteQuery = useQuery({
    queryKey: ["website-site", siteId],
    queryFn: () => (siteId ? websiteApi.getSite(siteId) : Promise.resolve(null)),
    enabled: Boolean(siteId),
  });

  const qaQuery = useQuery({
    queryKey: qaQueryKey,
    queryFn: () =>
      siteId
        ? websiteApi.listQa(siteId, {
            locale: filterLocale || undefined,
            status: filterStatus === "all" ? undefined : filterStatus,
          })
        : Promise.resolve({ items: [] }),
    enabled: Boolean(siteId),
  });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!siteId) {
        throw new Error("Missing siteId");
      }

      if (!form.question.trim() || !form.answerHtml.trim()) {
        throw new Error("Question and answer are required");
      }

      if (editingQaId) {
        return websiteApi.updateQa(siteId, editingQaId, {
          locale: form.locale,
          scope: form.scope,
          pageId: form.scope === "page" ? form.pageId.trim() || null : null,
          status: form.status,
          order: form.order,
          question: form.question.trim(),
          answerHtml: form.answerHtml.trim(),
        });
      }

      return websiteApi.createQa(siteId, {
        siteId,
        locale: form.locale,
        scope: form.scope,
        pageId: form.scope === "page" ? form.pageId.trim() || null : null,
        status: form.status,
        order: form.order,
        question: form.question.trim(),
        answerHtml: form.answerHtml.trim(),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qaQueryKey });
      toast.success(editingQaId ? "Q&A updated" : "Q&A created");
      setEditingQaId(null);
      setForm((prev) => ({
        ...DEFAULT_FORM,
        locale: prev.locale,
      }));
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to save Q&A";
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (qaId: string) => {
      if (!siteId) {
        throw new Error("Missing siteId");
      }
      await websiteApi.deleteQa(siteId, qaId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qaQueryKey });
      toast.success("Q&A deleted");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to delete Q&A";
      toast.error(message);
    },
  });

  const qaItems = qaQuery.data?.items ?? [];
  const defaultLocale = siteQuery.data?.site?.defaultLocale ?? "en-US";

  const onEdit = (item: WebsiteQa) => {
    setEditingQaId(item.id);
    setForm({
      locale: item.locale,
      scope: item.scope,
      pageId: item.pageId ?? "",
      status: item.status,
      order: item.order,
      question: item.question,
      answerHtml: item.answerHtml,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="text-lg font-semibold">Feedback & Q&A</div>
            <div className="text-sm text-muted-foreground">
              Configure FAQ content and connect public feedback submissions.
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MessageSquare className="h-4 w-4" />
            Public feedback endpoint
          </div>
          <p className="text-sm text-muted-foreground">
            Use this endpoint from your public website to submit feedback with optional images and
            YouTube URLs.
          </p>
          <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto">
            {`POST /public/website/feedback
{
  "siteRef": { "hostname": "your-domain.com", "path": "/", "locale": "${defaultLocale}" },
  "message": "Your message",
  "imageFileIds": ["file-id"],
  "youtubeUrls": ["https://youtu.be/dQw4w9WgXcQ"]
}`}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-semibold">Q&A items</div>
              <div className="text-sm text-muted-foreground">
                Manage FAQ entries displayed by `/public/website/qa`.
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Filter locale</Label>
              <Input
                value={filterLocale}
                onChange={(event) => setFilterLocale(event.target.value)}
                placeholder={defaultLocale}
              />
            </div>
            <div className="space-y-2">
              <Label>Filter status</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={filterStatus}
                onChange={(event) =>
                  setFilterStatus(event.target.value as "all" | "draft" | "published")
                }
              >
                <option value="all">All</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingQaId(null);
                  setForm((prev) => ({ ...DEFAULT_FORM, locale: prev.locale || defaultLocale }));
                }}
              >
                New item
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Locale</Label>
              <Input
                value={form.locale}
                onChange={(event) => setForm((prev) => ({ ...prev, locale: event.target.value }))}
                placeholder={defaultLocale}
              />
            </div>
            <div className="space-y-2">
              <Label>Order</Label>
              <Input
                type="number"
                value={form.order}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, order: Number(event.target.value || 0) }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Scope</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.scope}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, scope: event.target.value as "site" | "page" }))
                }
              >
                <option value="site">Site</option>
                <option value="page">Page</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Page ID (optional)</Label>
              <Input
                value={form.pageId}
                disabled={form.scope !== "page"}
                onChange={(event) => setForm((prev) => ({ ...prev, pageId: event.target.value }))}
                placeholder={form.scope === "page" ? "page_xxx" : "Only for page scope"}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    status: event.target.value as "draft" | "published",
                  }))
                }
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Question</Label>
            <Input
              value={form.question}
              onChange={(event) => setForm((prev) => ({ ...prev, question: event.target.value }))}
              placeholder="What is your refund policy?"
            />
          </div>

          <div className="space-y-2">
            <Label>Answer (HTML)</Label>
            <Textarea
              rows={6}
              value={form.answerHtml}
              onChange={(event) => setForm((prev) => ({ ...prev, answerHtml: event.target.value }))}
              placeholder="<p>We offer a 30-day refund policy.</p>"
            />
          </div>

          <div className="flex justify-end gap-2">
            {editingQaId ? (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingQaId(null);
                  setForm((prev) => ({ ...DEFAULT_FORM, locale: prev.locale }));
                }}
              >
                Cancel edit
              </Button>
            ) : null}
            <Button variant="accent" onClick={() => void upsertMutation.mutate()}>
              <Save className="h-4 w-4" />
              {editingQaId ? "Update item" : "Create item"}
            </Button>
          </div>

          <div className="space-y-2">
            {qaQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">Loading Q&A items...</div>
            ) : qaItems.length === 0 ? (
              <div className="rounded-md border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                No Q&A items found.
              </div>
            ) : (
              <div className="space-y-2">
                {qaItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-md border border-border/60 p-4 flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="font-medium">{item.question}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant={item.status === "published" ? "success" : "warning"}>
                          {item.status}
                        </Badge>
                        <span>{item.locale}</span>
                        <span>scope: {item.scope}</span>
                        <span>order: {item.order}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void deleteMutation.mutate(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
