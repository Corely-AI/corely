import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, ExternalLink, Plus, GripVertical, Copy, Trash2, Eye } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Switch,
  Textarea,
} from "@corely/ui";
import type {
  WebsiteBlock,
  WebsiteBlockType,
  WebsitePageContent,
  WebsitePageStatus,
} from "@corely/contracts";
import { WebsitePageContentSchema } from "@corely/contracts";
import { websiteApi } from "@/lib/website-api";
import { cmsApi } from "@/lib/cms-api";
import {
  websitePageContentKeys,
  websitePageKeys,
  websitePageListKey,
  websiteSiteKeys,
} from "../queries";
import { invalidateResourceQueries } from "@/shared/crud";
import { toast } from "sonner";
import { getPublicWebsiteUrl } from "@/shared/lib/public-urls";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";
import {
  WebsiteBlockEditorRegistry,
  WebsiteTemplateEditorRegistry,
  type WebsiteBlockEditorField,
} from "../blocks/website-block-editor-registry";

const statusVariant = (status: WebsitePageStatus) => {
  switch (status) {
    case "PUBLISHED":
      return "success";
    default:
      return "warning";
  }
};

const createBlockId = (type: WebsiteBlockType): string =>
  `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const cloneContent = (content: WebsitePageContent): WebsitePageContent => ({
  ...content,
  blocks: content.blocks.map((block) => ({ ...block, props: { ...block.props } })),
});

const areContentsEqual = (left: WebsitePageContent, right: WebsitePageContent): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const getValueAtPath = (source: unknown, path: string): unknown => {
  const segments = path.split(".");
  let cursor = source;
  for (const segment of segments) {
    if (!cursor || typeof cursor !== "object" || Array.isArray(cursor)) {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
};

const setValueAtPath = (
  source: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> => {
  const segments = path.split(".");
  const root: Record<string, unknown> = { ...source };
  let cursor: Record<string, unknown> = root;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]!;
    const isLast = index === segments.length - 1;

    if (isLast) {
      if (value === undefined || value === null || value === "") {
        delete cursor[segment];
      } else {
        cursor[segment] = value;
      }
      continue;
    }

    const existing = cursor[segment];
    const next =
      existing && typeof existing === "object" && !Array.isArray(existing)
        ? { ...(existing as Record<string, unknown>) }
        : {};
    cursor[segment] = next;
    cursor = next;
  }

  return root;
};

const reorderBlocks = (
  blocks: WebsiteBlock[],
  sourceId: string,
  targetId: string
): WebsiteBlock[] => {
  if (sourceId === targetId) {
    return blocks;
  }

  const sourceIndex = blocks.findIndex((block) => block.id === sourceId);
  const targetIndex = blocks.findIndex((block) => block.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) {
    return blocks;
  }

  const next = [...blocks];
  const [moved] = next.splice(sourceIndex, 1);
  if (!moved) {
    return blocks;
  }
  next.splice(targetIndex, 0, moved);
  return next;
};

const buildPreviewToken = (): string =>
  `preview_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;

export default function WebsitePageEditorPage() {
  const { siteId, pageId } = useParams<{ siteId: string; pageId: string }>();
  const isEdit = Boolean(pageId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeWorkspace } = useWorkspace();

  const { data: pageData } = useQuery({
    queryKey: websitePageKeys.detail(pageId ?? ""),
    queryFn: () => (pageId ? websiteApi.getPage(pageId) : Promise.resolve(null)),
    enabled: isEdit,
  });

  const page = pageData?.page;
  const resolvedSiteId = siteId ?? page?.siteId;

  const { data: siteData } = useQuery({
    queryKey: websiteSiteKeys.detail(resolvedSiteId ?? ""),
    queryFn: () => (resolvedSiteId ? websiteApi.getSite(resolvedSiteId) : Promise.resolve(null)),
    enabled: Boolean(resolvedSiteId),
  });

  const { data: cmsPosts } = useQuery({
    queryKey: ["cms", "posts", "options"],
    queryFn: () => cmsApi.listPosts({ pageSize: 50 }),
  });

  const { data: pageContentData } = useQuery({
    queryKey: websitePageContentKeys.detail(pageId ?? ""),
    queryFn: () => (pageId ? websiteApi.getPageContent(pageId) : Promise.resolve(null)),
    enabled: isEdit,
  });

  const [path, setPath] = useState("/");
  const [locale, setLocale] = useState("en-US");
  const [template, setTemplate] = useState("landing.tutoring.v1");
  const [cmsEntryId, setCmsEntryId] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoImageFileId, setSeoImageFileId] = useState("");
  const [status, setStatus] = useState<WebsitePageStatus>("DRAFT");
  const [content, setContent] = useState<WebsitePageContent | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [dragBlockId, setDragBlockId] = useState<string | null>(null);
  const [isAddBlockOpen, setIsAddBlockOpen] = useState(false);
  const [newBlockType, setNewBlockType] = useState<WebsiteBlockType>("hero");
  const [aiBrief, setAiBrief] = useState("");
  const [aiInstruction, setAiInstruction] = useState("");

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

  useEffect(() => {
    if (!pageContentData?.content) {
      return;
    }

    const next = cloneContent(pageContentData.content);
    setContent((current) => (current && areContentsEqual(current, next) ? current : next));
    setSelectedBlockId((current) =>
      current && next.blocks.some((block) => block.id === current)
        ? current
        : (next.blocks[0]?.id ?? null)
    );
  }, [pageContentData?.content]);

  useEffect(() => {
    if (pageContentData?.content) {
      return;
    }

    setContent((current) => {
      if (current) {
        return current;
      }
      const templateDef =
        WebsiteTemplateEditorRegistry.get(template.trim()) ??
        WebsiteTemplateEditorRegistry.fallback();
      return cloneContent(templateDef.defaultContent());
    });
  }, [pageContentData?.content, template]);

  useEffect(() => {
    if (!content) {
      setSelectedBlockId(null);
      return;
    }
    setSelectedBlockId((current) =>
      current && content.blocks.some((block) => block.id === current)
        ? current
        : (content.blocks[0]?.id ?? null)
    );
  }, [content]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        path: path.trim(),
        locale: locale.trim(),
        templateKey: template.trim(),
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
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to save page");
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      if (!pageId || !content) {
        throw new Error("Save the page first before editing blocks.");
      }
      const parsed = WebsitePageContentSchema.safeParse({
        ...content,
        templateKey: content.templateKey || template.trim(),
      });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message || "Invalid block content");
      }
      return websiteApi.updatePageContent(pageId, parsed.data);
    },
    onSuccess: (result) => {
      toast.success("Draft blocks saved");
      setContent(cloneContent(result.content));
      void queryClient.invalidateQueries({ queryKey: websitePageContentKeys.detail(pageId ?? "") });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to save draft blocks");
    },
  });

  const generateBlocksMutation = useMutation({
    mutationFn: async () => {
      if (!content) {
        throw new Error("No content loaded");
      }
      return websiteApi.generateBlocks({
        templateKey: content.templateKey,
        locale: locale.trim(),
        brief: aiBrief.trim() || "Refresh blocks",
        existingBlocks: content.blocks,
      });
    },
    onSuccess: (result) => {
      setContent(cloneContent(result.content));
      setSelectedBlockId(result.content.blocks[0]?.id ?? null);
      toast.success("AI blocks generated");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to generate blocks");
    },
  });

  const regenerateBlockMutation = useMutation({
    mutationFn: async () => {
      if (!content || !selectedBlock) {
        throw new Error("Select a block first");
      }
      return websiteApi.regenerateBlock({
        templateKey: content.templateKey,
        blockType: selectedBlock.type,
        currentBlock: selectedBlock,
        instruction: aiInstruction.trim() || "Refine this block",
      });
    },
    onSuccess: (result) => {
      if (!content || !selectedBlock) {
        return;
      }
      setContent({
        ...content,
        blocks: content.blocks.map((block) =>
          block.id === selectedBlock.id ? result.block : block
        ),
      });
      toast.success("Block regenerated");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to regenerate block");
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!pageId) {
        throw new Error("Missing pageId");
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
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to publish page");
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async () => {
      if (!pageId) {
        throw new Error("Missing pageId");
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
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to unpublish page");
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

  const templateDefinition = useMemo(
    () =>
      WebsiteTemplateEditorRegistry.get(template.trim()) ??
      WebsiteTemplateEditorRegistry.fallback(),
    [template]
  );

  const blocks = content?.blocks ?? [];
  const selectedBlock = blocks.find((block) => block.id === selectedBlockId) ?? null;
  const selectedDefinition = selectedBlock
    ? WebsiteBlockEditorRegistry.get(selectedBlock.type)
    : null;
  const addableTypes = templateDefinition.allowedBlockTypes;

  const updateSelectedBlockField = (field: WebsiteBlockEditorField, value: unknown) => {
    if (!content || !selectedBlock) {
      return;
    }

    setContent({
      ...content,
      blocks: content.blocks.map((block) => {
        if (block.id !== selectedBlock.id) {
          return block;
        }

        const nextProps = setValueAtPath({ ...block.props }, field.key, value);
        const parsed = selectedDefinition?.schema.safeParse({
          ...block,
          props: nextProps,
        });

        return parsed && parsed.success
          ? parsed.data
          : {
              ...block,
              props: nextProps,
            };
      }),
    });
  };

  const addBlock = () => {
    if (!content) {
      return;
    }

    const definition = WebsiteBlockEditorRegistry.get(newBlockType);
    const nextBlockCandidate = {
      id: createBlockId(newBlockType),
      type: newBlockType,
      enabled: true,
      props: { ...definition.defaultProps },
    };
    const parsed = definition.schema.safeParse(nextBlockCandidate);
    if (!parsed.success) {
      toast.error("Block defaults are invalid.");
      return;
    }

    const next = {
      ...content,
      blocks: [...content.blocks, parsed.data],
    };
    setContent(next);
    setSelectedBlockId(parsed.data.id);
    setIsAddBlockOpen(false);
  };

  const duplicateBlock = (block: WebsiteBlock) => {
    if (!content) {
      return;
    }
    const nextBlock = {
      ...block,
      id: createBlockId(block.type),
      props: { ...block.props },
    };
    setContent({
      ...content,
      blocks: [...content.blocks, nextBlock],
    });
    setSelectedBlockId(nextBlock.id);
  };

  const removeBlock = (blockId: string) => {
    if (!content) {
      return;
    }
    const nextBlocks = content.blocks.filter((block) => block.id !== blockId);
    setContent({ ...content, blocks: nextBlocks });
    if (selectedBlockId === blockId) {
      setSelectedBlockId(nextBlocks[0]?.id ?? null);
    }
  };

  const toggleBlockEnabled = (blockId: string, enabled: boolean) => {
    if (!content) {
      return;
    }
    setContent({
      ...content,
      blocks: content.blocks.map((block) => (block.id === blockId ? { ...block, enabled } : block)),
    });
  };

  const handleDropBlock = (targetId: string) => {
    if (!content || !dragBlockId) {
      return;
    }
    setContent({
      ...content,
      blocks: reorderBlocks(content.blocks, dragBlockId, targetId),
    });
    setDragBlockId(null);
  };

  const previewUrl = useMemo(() => {
    const site = siteData?.site;
    if (!site || !activeWorkspace?.slug) {
      return null;
    }
    return getPublicWebsiteUrl({
      workspaceSlug: activeWorkspace.slug,
      websiteSlug: site.slug,
      isDefault: site.isDefault,
      path,
    });
  }, [activeWorkspace?.slug, siteData?.site, path]);

  const openPreview = () => {
    if (!previewUrl) {
      toast.error("Preview URL is unavailable.");
      return;
    }
    const token = buildPreviewToken();
    const separator = previewUrl.includes("?") ? "&" : "?";
    window.open(`${previewUrl}${separator}preview=1&token=${encodeURIComponent(token)}`, "_blank");
  };

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="text-lg font-semibold">{isEdit ? "Edit page" : "Create page"}</div>
            <div className="text-sm text-muted-foreground">
              Define route, template, SEO, and blocks
            </div>
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
        <CardContent className="space-y-5 p-6">
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
              <Label>Template key</Label>
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
                Edit CMS entry
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

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold">Page blocks</h3>
              <p className="text-sm text-muted-foreground">
                Drag to reorder, toggle visibility, and edit block properties.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" disabled={!previewUrl} onClick={openPreview}>
                <Eye className="h-4 w-4" />
                Preview
              </Button>
              <Button
                variant="accent"
                disabled={!isEdit || !content || saveDraftMutation.isPending}
                onClick={() => void saveDraftMutation.mutate()}
              >
                <Save className="h-4 w-4" />
                Save Draft
              </Button>
            </div>
          </div>

          {!isEdit ? (
            <p className="rounded-md border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
              Save the page first to enable the block editor.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-2 rounded-md border border-border/60 p-3">
                <div className="flex-1 min-w-[220px] space-y-1">
                  <Label>AI brief</Label>
                  <Textarea
                    rows={2}
                    placeholder="Generate a conversion-focused landing page for A1 learners"
                    value={aiBrief}
                    onChange={(event) => setAiBrief(event.target.value)}
                  />
                </div>
                <Button variant="outline" onClick={() => void generateBlocksMutation.mutate()}>
                  Generate blocks
                </Button>
              </div>

              <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
                <div className="space-y-3 rounded-md border border-border/60 p-3">
                  <div className="flex items-center justify-between">
                    <Label>Blocks</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAddBlockOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Add block
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {blocks.map((block) => {
                      const blockDef = WebsiteBlockEditorRegistry.get(block.type);
                      return (
                        <div
                          key={block.id}
                          draggable
                          onDragStart={() => setDragBlockId(block.id)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => handleDropBlock(block.id)}
                          className={`rounded-md border p-2 ${
                            selectedBlockId === block.id ? "border-primary" : "border-border/60"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="text-muted-foreground"
                              onClick={() => setSelectedBlockId(block.id)}
                            >
                              <GripVertical className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="flex-1 text-left"
                              onClick={() => setSelectedBlockId(block.id)}
                            >
                              <div className="text-sm font-medium">{blockDef.displayName}</div>
                              <div className="text-xs text-muted-foreground">{block.type}</div>
                            </button>
                            <Switch
                              checked={block.enabled !== false}
                              onCheckedChange={(checked) =>
                                toggleBlockEnabled(block.id, Boolean(checked))
                              }
                            />
                          </div>
                          <div className="mt-2 flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => duplicateBlock(block)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeBlock(block.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 rounded-md border border-border/60 p-3">
                  {selectedBlock && selectedDefinition ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold">
                            {selectedDefinition.displayName}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {selectedDefinition.description}
                          </p>
                        </div>
                        <Badge variant={selectedBlock.enabled === false ? "warning" : "success"}>
                          {selectedBlock.enabled === false ? "Disabled" : "Enabled"}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        {selectedDefinition.fields.map((field) => {
                          const rawValue = getValueAtPath(selectedBlock.props, field.key);
                          const boolValue = Boolean(rawValue);
                          const textValue = typeof rawValue === "string" ? rawValue : "";

                          if (field.type === "boolean") {
                            return (
                              <div
                                key={field.key}
                                className="flex items-center justify-between rounded-md border border-border/60 p-2"
                              >
                                <Label>{field.label}</Label>
                                <Switch
                                  checked={boolValue}
                                  onCheckedChange={(checked) =>
                                    updateSelectedBlockField(field, checked)
                                  }
                                />
                              </div>
                            );
                          }

                          return (
                            <div key={field.key} className="space-y-1">
                              <Label>{field.label}</Label>
                              {field.type === "textarea" ? (
                                <Textarea
                                  rows={3}
                                  value={textValue}
                                  onChange={(event) =>
                                    updateSelectedBlockField(field, event.target.value || undefined)
                                  }
                                />
                              ) : (
                                <Input
                                  value={textValue}
                                  onChange={(event) =>
                                    updateSelectedBlockField(field, event.target.value || undefined)
                                  }
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="space-y-2 rounded-md border border-border/60 p-3">
                        <Label>AI instruction</Label>
                        <Textarea
                          rows={2}
                          placeholder="Disable this block on mobile"
                          value={aiInstruction}
                          onChange={(event) => setAiInstruction(event.target.value)}
                        />
                        <Button
                          variant="outline"
                          onClick={() => void regenerateBlockMutation.mutate()}
                        >
                          Regenerate selected block
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Select a block to edit its properties.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddBlockOpen} onOpenChange={setIsAddBlockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add block</DialogTitle>
            <DialogDescription>
              Choose a block type allowed by this template and insert it at the end of the page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Block type</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={newBlockType}
              onChange={(event) => setNewBlockType(event.target.value as WebsiteBlockType)}
            >
              {addableTypes.map((type) => {
                const def = WebsiteBlockEditorRegistry.get(type);
                return (
                  <option key={type} value={type}>
                    {def.displayName}
                  </option>
                );
              })}
            </select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddBlockOpen(false)}>
                Cancel
              </Button>
              <Button onClick={addBlock}>Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
