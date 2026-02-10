import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, ExternalLink } from "lucide-react";
import { Button, Card, CardContent, Input, Label, Textarea, Badge } from "@corely/ui";
import { websiteApi } from "@/lib/website-api";
import { cmsApi } from "@/lib/cms-api";
import { websitePageKeys, websitePageListKey } from "../queries";
import { invalidateResourceQueries } from "@/shared/crud";
import { toast } from "sonner";
import type { WebsitePageStatus } from "@corely/contracts";

const statusVariant = (status: WebsitePageStatus) => {
  switch (status) {
    case "PUBLISHED":
      return "success";
    default:
      return "warning";
  }
};

export default function WebsitePageEditorPage() {
  const { siteId, pageId } = useParams<{ siteId: string; pageId: string }>();
  const isEdit = Boolean(pageId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: pageData } = useQuery({
    queryKey: websitePageKeys.detail(pageId ?? ""),
    queryFn: () => (pageId ? websiteApi.getPage(pageId) : Promise.resolve(null)),
    enabled: isEdit,
  });

  const page = pageData?.page;
  const resolvedSiteId = siteId ?? page?.siteId;

  const { data: cmsPosts } = useQuery({
    queryKey: ["cms", "posts", "options"],
    queryFn: () => cmsApi.listPosts({ pageSize: 50 }),
  });

  const [path, setPath] = useState("/");
  const [locale, setLocale] = useState("en-US");
  const [template, setTemplate] = useState("landing");
  const [cmsEntryId, setCmsEntryId] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoImageFileId, setSeoImageFileId] = useState("");
  const [status, setStatus] = useState<WebsitePageStatus>("DRAFT");

  useEffect(() => {
    if (!page) {
      return;
    }
    setPath(page.path);
    setLocale(page.locale);
    setTemplate(page.template);
    setCmsEntryId(page.cmsEntryId);
    setSeoTitle(page.seoTitle ?? "");
    setSeoDescription(page.seoDescription ?? "");
    setSeoImageFileId(page.seoImageFileId ?? "");
    setStatus(page.status);
  }, [page]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        path: path.trim(),
        locale: locale.trim(),
        template: template.trim(),
        cmsEntryId: cmsEntryId.trim(),
        seoTitle: seoTitle.trim() || undefined,
        seoDescription: seoDescription.trim() || undefined,
        seoImageFileId: seoImageFileId.trim() || undefined,
      };
      if (isEdit && pageId) {
        return websiteApi.updatePage(pageId, payload);
      }
      if (!siteId) {
        throw new Error("Missing siteId");
      }
      return websiteApi.createPage(siteId, { ...payload, siteId });
    },
    onSuccess: (saved) => {
      void invalidateResourceQueries(queryClient, "website-pages");
      toast.success(isEdit ? "Page updated" : "Page created");
      if (!isEdit) {
        navigate(`/website/pages/${saved.id}/edit`);
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save page");
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!pageId) {
        return;
      }
      return websiteApi.publishPage(pageId);
    },
    onSuccess: (result) => {
      toast.success("Page published");
      setStatus(result.page.status);
      void queryClient.invalidateQueries({ queryKey: websitePageKeys.detail(pageId ?? "") });
      void queryClient.invalidateQueries({
        queryKey: websitePageListKey({ siteId: resolvedSiteId }),
      });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to publish page");
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async () => {
      if (!pageId) {
        return;
      }
      return websiteApi.unpublishPage(pageId);
    },
    onSuccess: (result) => {
      toast.success("Page unpublished");
      setStatus(result.page.status);
      void queryClient.invalidateQueries({ queryKey: websitePageKeys.detail(pageId ?? "") });
      void queryClient.invalidateQueries({
        queryKey: websitePageListKey({ siteId: resolvedSiteId }),
      });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to unpublish page");
    },
  });

  const canSave = useMemo(
    () =>
      path.trim().length > 0 &&
      locale.trim().length > 0 &&
      template.trim().length > 0 &&
      cmsEntryId.trim().length > 0,
    [path, locale, template, cmsEntryId]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="text-lg font-semibold">{isEdit ? "Edit page" : "Create page"}</div>
            <div className="text-sm text-muted-foreground">Define route, template, and SEO</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEdit ? <Badge variant={statusVariant(status)}>{status}</Badge> : null}
          {isEdit ? (
            status === "PUBLISHED" ? (
              <Button variant="outline" onClick={() => void unpublishMutation.mutate()}>
                Unpublish
              </Button>
            ) : (
              <Button variant="outline" onClick={() => void publishMutation.mutate()}>
                Publish
              </Button>
            )
          ) : null}
          <Button
            variant="accent"
            disabled={!canSave || saveMutation.isPending}
            onClick={() => void saveMutation.mutate()}
          >
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Path</Label>
              <Input value={path} onChange={(event) => setPath(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Locale</Label>
              <Input value={locale} onChange={(event) => setLocale(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Template</Label>
              <Input value={template} onChange={(event) => setTemplate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>CMS entry</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={cmsEntryId}
                onChange={(event) => setCmsEntryId(event.target.value)}
              >
                <option value="">Select a CMS entry</option>
                {(cmsPosts?.items ?? []).map((post) => (
                  <option key={post.id} value={post.id}>
                    {post.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {cmsEntryId ? (
            <div>
              <Button variant="outline" onClick={() => navigate(`/cms/posts/${cmsEntryId}/edit`)}>
                <ExternalLink className="h-4 w-4" />
                Edit content
              </Button>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>SEO title</Label>
              <Input value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>SEO description</Label>
              <Textarea
                value={seoDescription}
                onChange={(event) => setSeoDescription(event.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>SEO image file ID</Label>
              <Input
                value={seoImageFileId}
                onChange={(event) => setSeoImageFileId(event.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
