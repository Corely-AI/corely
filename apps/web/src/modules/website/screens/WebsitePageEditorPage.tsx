import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { Badge, Button } from "@corely/ui";
import type {
  WebsiteBlock,
  WebsiteBlockType,
  WebsitePageContent,
  WebsitePageStatus,
} from "@corely/contracts";
import { websiteApi } from "@/lib/website-api";
import { cmsApi } from "@/lib/cms-api";
import { websitePageContentKeys, websitePageKeys, websiteSiteKeys } from "../queries";
import { toast } from "sonner";
import { getPublicWebsiteUrl } from "@/shared/lib/public-urls";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";
import {
  WebsiteBlockEditorRegistry,
  WebsiteTemplateEditorRegistry,
  type WebsiteBlockEditorField,
} from "../blocks/website-block-editor-registry";
import {
  areContentsEqual,
  buildDefaultContentForTemplate,
  cloneContent,
  createBlockId,
  getValueAtPath,
  normalizeFileIdList,
  openWebsitePreviewWindow,
  reorderBlocks,
  setValueAtPath,
  statusVariant,
} from "./website-page-editor.utils";
import { WebsitePageEditorDetailsCard } from "./website-page-editor-details-card";
import { WebsitePageEditorBlocksCard } from "./website-page-editor-blocks-card";
import { useWebsitePageEditorMutations } from "./use-website-page-editor-mutations";
import { renderWebsitePageBlockPreview } from "./website-page-editor-preview";

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

  const page = pageData?.page,
    resolvedSiteId = siteId ?? page?.siteId;

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
  const [jsonFieldDrafts, setJsonFieldDrafts] = useState<Record<string, string>>({});
  const [uploadingFieldKey, setUploadingFieldKey] = useState<string | null>(null);

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
    if (isEdit) {
      return;
    }
    const next = buildDefaultContentForTemplate(template);
    setContent(next);
    setSelectedBlockId(next.blocks[0]?.id ?? null);
    setJsonFieldDrafts({});
  }, [isEdit, pageContentData?.content, template]);

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

  const canSave =
    path.trim().length > 0 &&
    locale.trim().length > 0 &&
    template.trim().length > 0 &&
    cmsEntryId.trim().length > 0;

  const templateDefinition =
    WebsiteTemplateEditorRegistry.get(template.trim()) ?? WebsiteTemplateEditorRegistry.fallback();
  const availableTemplates = useMemo(() => WebsiteTemplateEditorRegistry.all(), []);
  const hasUnknownTemplate =
    template.trim().length > 0 &&
    !availableTemplates.some((definition) => definition.templateKey === template.trim());
  const blocks = content?.blocks ?? [],
    selectedBlock = blocks.find((block) => block.id === selectedBlockId) ?? null,
    selectedDefinition = selectedBlock ? WebsiteBlockEditorRegistry.get(selectedBlock.type) : null;
  const {
    saveMutation,
    saveDraftMutation,
    generateBlocksMutation,
    regenerateBlockMutation,
    publishMutation,
    unpublishMutation,
  } = useWebsitePageEditorMutations({
    isEdit,
    pageId,
    siteId,
    path,
    locale,
    template,
    cmsEntryId,
    seoTitle,
    seoDescription,
    seoImageFileId,
    queryClient,
    navigate,
    resolvedSiteId,
    content,
    aiBrief,
    selectedBlock,
    aiInstruction,
    setContent,
    setSelectedBlockId,
    setStatus,
  });

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
          : ({
              ...block,
              props: nextProps,
            } as WebsiteBlock);
      }),
    });
  };

  const resolveFieldStateKey = (fieldKey: string): string =>
    selectedBlock ? `${selectedBlock.id}:${fieldKey}` : fieldKey;

  const commitJsonFieldDraft = (field: WebsiteBlockEditorField) => {
    if (!selectedBlock) {
      return;
    }
    const stateKey = resolveFieldStateKey(field.key);
    const draft = jsonFieldDrafts[stateKey];
    if (draft === undefined) {
      return;
    }
    const trimmed = draft.trim();
    if (!trimmed) {
      updateSelectedBlockField(field, undefined);
      setJsonFieldDrafts((current) => {
        const next = { ...current };
        delete next[stateKey];
        return next;
      });
      return;
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      updateSelectedBlockField(field, parsed);
      setJsonFieldDrafts((current) => {
        const next = { ...current };
        delete next[stateKey];
        return next;
      });
    } catch {
      toast.error("Invalid JSON for this field.");
    }
  };

  const uploadFilesToField = async (field: WebsiteBlockEditorField, files: FileList | null) => {
    if (!selectedBlock || !files || files.length === 0) {
      return;
    }

    const stateKey = resolveFieldStateKey(field.key);
    setUploadingFieldKey(stateKey);
    try {
      const uploads = await Promise.all(
        Array.from(files).map((file) =>
          cmsApi.uploadCmsAsset(file, {
            purpose: "website-block-image",
            category: "website",
          })
        )
      );
      const uploadedFileIds = uploads.map((item) => item.fileId);
      if (field.type === "fileId") {
        updateSelectedBlockField(field, uploadedFileIds[0]);
      } else {
        const currentValue = getValueAtPath(selectedBlock.props, field.key);
        const merged = Array.from(
          new Set([...normalizeFileIdList(currentValue), ...uploadedFileIds])
        );
        updateSelectedBlockField(field, merged);
      }
      toast.success("Image uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setUploadingFieldKey(null);
    }
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
    const nextBlock: WebsiteBlock = {
      ...block,
      id: createBlockId(block.type),
      props: { ...(block.props as Record<string, unknown>) },
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
    openWebsitePreviewWindow(previewUrl);
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

      <WebsitePageEditorDetailsCard
        path={path}
        onPathChange={setPath}
        locale={locale}
        onLocaleChange={setLocale}
        template={template}
        onTemplateChange={(nextTemplate) => {
          setTemplate(nextTemplate);
          if (!isEdit) {
            const next = buildDefaultContentForTemplate(nextTemplate);
            setContent(next);
            setSelectedBlockId(next.blocks[0]?.id ?? null);
            setJsonFieldDrafts({});
          }
        }}
        hasUnknownTemplate={hasUnknownTemplate}
        availableTemplates={availableTemplates}
        cmsEntryId={cmsEntryId}
        onCmsEntryChange={setCmsEntryId}
        cmsEntryOptions={(cmsPosts?.items ?? []).map((post) => ({
          id: post.id,
          title: post.title,
        }))}
        onEditCmsEntry={() => navigate(`/cms/posts/${cmsEntryId}/edit`)}
        seoTitle={seoTitle}
        onSeoTitleChange={setSeoTitle}
        seoDescription={seoDescription}
        onSeoDescriptionChange={setSeoDescription}
        seoImageFileId={seoImageFileId}
        onSeoImageFileIdChange={setSeoImageFileId}
      />

      <WebsitePageEditorBlocksCard
        isEdit={isEdit}
        previewUrl={previewUrl}
        onOpenPreview={openPreview}
        hasContent={Boolean(content)}
        saveDraftPending={saveDraftMutation.isPending}
        onSaveDraft={() => void saveDraftMutation.mutate()}
        aiBrief={aiBrief}
        setAiBrief={setAiBrief}
        onGenerateBlocks={() => void generateBlocksMutation.mutate()}
        blocks={blocks}
        selectedBlockId={selectedBlockId}
        setSelectedBlockId={setSelectedBlockId}
        setDragBlockId={setDragBlockId}
        onHandleDropBlock={handleDropBlock}
        onToggleBlockEnabled={toggleBlockEnabled}
        onDuplicateBlock={duplicateBlock}
        onRemoveBlock={removeBlock}
        template={template}
        onLoadTemplateDefaults={() => {
          const next = buildDefaultContentForTemplate(template);
          setContent(next);
          setSelectedBlockId(next.blocks[0]?.id ?? null);
          setJsonFieldDrafts({});
        }}
        isAddBlockOpen={isAddBlockOpen}
        setIsAddBlockOpen={setIsAddBlockOpen}
        newBlockType={newBlockType}
        setNewBlockType={setNewBlockType}
        addableTypes={templateDefinition.allowedBlockTypes}
        onAddBlock={addBlock}
        selectedBlock={selectedBlock}
        selectedDefinition={selectedDefinition}
        renderSelectedBlockPreview={() => renderWebsitePageBlockPreview(selectedBlock)}
        jsonFieldDrafts={jsonFieldDrafts}
        setJsonFieldDrafts={setJsonFieldDrafts}
        uploadingFieldKey={uploadingFieldKey}
        onUpdateSelectedBlockField={updateSelectedBlockField}
        onCommitJsonFieldDraft={commitJsonFieldDraft}
        onUploadFilesToField={uploadFilesToField}
        aiInstruction={aiInstruction}
        setAiInstruction={setAiInstruction}
        onRegenerateBlock={() => void regenerateBlockMutation.mutate()}
      />
    </div>
  );
}
