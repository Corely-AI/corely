import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { WebsiteBlockType, WebsitePageContent, WebsitePageStatus } from "@corely/contracts";
import { websiteApi } from "@/lib/website-api";
import { cmsApi } from "@/lib/cms-api";
import {
  websitePageContentKeys,
  websitePageKeys,
  websitePageListKey,
  websiteSiteKeys,
} from "../queries";
import { toast } from "sonner";
import { getPublicWebsiteUrl } from "@/shared/lib/public-urls";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";
import {
  WebsiteBlockEditorRegistry,
  WebsiteTemplateEditorRegistry,
} from "../blocks/website-block-editor-registry";
import {
  areContentsEqual,
  buildDefaultContentForPreset,
  buildUniqueWebsitePath,
  buildDefaultContentForTemplate,
  buildLocalizedPreviewPath,
  cloneContent,
  openWebsitePreviewWindow,
  suggestPathBaseFromPreset,
  suggestPathBaseFromTemplate,
} from "./website-page-editor.utils";
import { WebsitePageEditorDetailsCard } from "./website-page-editor-details-card";
import { WebsitePageEditorBlocksCard } from "./website-page-editor-blocks-card";
import { useWebsitePageEditorMutations } from "./use-website-page-editor-mutations";
import { renderWebsitePageBlockPreview } from "./website-page-editor-preview";
import { WebsitePageEditorHeader } from "./website-page-editor-header";
import { createWebsitePageEditorBlockActions } from "./website-page-editor-block-actions";
import { WebsitePageEditorPresetRegistry } from "./website-page-editor-preset-registry";
import {
  mergePresetDefinitions,
  toSitePresetDefinitions,
} from "./website-page-editor-site-presets";
import { useWebsitePageEditorSavePreset } from "./use-website-page-editor-save-preset";

const DEFAULT_PRESET = WebsitePageEditorPresetRegistry.fallback();

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
  const { data: existingPagesData } = useQuery({
    queryKey: websitePageListKey({
      siteId: resolvedSiteId,
      page: 1,
      pageSize: 200,
    }),
    queryFn: () =>
      resolvedSiteId
        ? websiteApi.listPages(resolvedSiteId, { siteId: resolvedSiteId, page: 1, pageSize: 200 })
        : Promise.resolve({
            items: [],
            pageInfo: {
              page: 1,
              pageSize: 200,
              total: 0,
              hasNextPage: false,
            },
          }),
    enabled: Boolean(resolvedSiteId) && !isEdit,
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

  const [path, setPath] = useState("");
  const [hasEditedPath, setHasEditedPath] = useState(false);
  const [locale, setLocale] = useState(DEFAULT_PRESET.defaultLocale);
  const [presetKey, setPresetKey] = useState(DEFAULT_PRESET.presetKey);
  const [template, setTemplate] = useState(DEFAULT_PRESET.templateKey);
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

  const builtInPresets = useMemo(() => WebsitePageEditorPresetRegistry.all(), []);
  const sitePresets = useMemo(
    () => toSitePresetDefinitions(siteData?.site.settings?.custom),
    [siteData?.site.settings?.custom]
  );
  const availablePresets = useMemo(
    () => mergePresetDefinitions(builtInPresets, sitePresets),
    [builtInPresets, sitePresets]
  );

  const resolvePreset = useCallback(
    (candidateKey: string) =>
      availablePresets.find((preset) => preset.presetKey === candidateKey) ??
      WebsitePageEditorPresetRegistry.get(candidateKey) ??
      DEFAULT_PRESET,
    [availablePresets]
  );

  const resolveDefaultPresetForTemplate = useCallback(
    (templateKey: string) =>
      availablePresets.find(
        (preset) => preset.templateKey === templateKey && preset.isTemplateDefault === true
      ) ??
      availablePresets.find((preset) => preset.templateKey === templateKey) ??
      null,
    [availablePresets]
  );

  const resolvePresetForContent = useCallback(
    (candidateContent: WebsitePageContent): string | null => {
      for (const preset of availablePresets) {
        if (preset.templateKey !== candidateContent.templateKey) {
          continue;
        }
        const presetContent = buildDefaultContentForPreset(preset.presetKey, availablePresets);
        if (areContentsEqual(presetContent, candidateContent)) {
          return preset.presetKey;
        }
      }
      return null;
    },
    [availablePresets]
  );

  useEffect(() => {
    if (!page) {
      return;
    }
    setPath(page.path);
    setHasEditedPath(true);
    setLocale(page.locale);
    setTemplate(page.template);
    setPresetKey(
      resolveDefaultPresetForTemplate(page.template)?.presetKey ?? DEFAULT_PRESET.presetKey
    );
    setCmsEntryId(page.cmsEntryId);
    setSeoTitle(page.seoTitle ?? "");
    setSeoDescription(page.seoDescription ?? "");
    setSeoImageFileId(page.seoImageFileId ?? "");
    setStatus(page.status);
  }, [page, resolveDefaultPresetForTemplate]);

  useEffect(() => {
    if (!pageContentData?.content) {
      return;
    }

    const next = cloneContent(pageContentData.content);
    setTemplate(next.templateKey || page?.template || DEFAULT_PRESET.templateKey);
    const matchedPresetKey =
      resolvePresetForContent(next) ??
      resolveDefaultPresetForTemplate(next.templateKey)?.presetKey ??
      DEFAULT_PRESET.presetKey;
    setPresetKey(matchedPresetKey);
    setContent((current) => (current && areContentsEqual(current, next) ? current : next));
    setSelectedBlockId((current) =>
      current && next.blocks.some((block) => block.id === current)
        ? current
        : (next.blocks[0]?.id ?? null)
    );
  }, [
    page?.template,
    pageContentData?.content,
    resolveDefaultPresetForTemplate,
    resolvePresetForContent,
  ]);

  useEffect(() => {
    if (pageContentData?.content) {
      return;
    }
    if (isEdit) {
      return;
    }
    const next = buildDefaultContentForPreset(presetKey, availablePresets);
    setTemplate(next.templateKey);
    setContent(next);
    setSelectedBlockId(next.blocks[0]?.id ?? null);
    setJsonFieldDrafts({});
  }, [isEdit, pageContentData?.content, presetKey, availablePresets]);

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

  const suggestedPath = useMemo(() => {
    const localeKey = locale.trim().toLowerCase();
    const existingPaths = new Set(
      (existingPagesData?.items ?? [])
        .filter((item) => item.locale.trim().toLowerCase() === localeKey)
        .map((item) => item.path)
    );
    const presetDefinition = resolvePreset(presetKey);
    const basePath =
      !isEdit && presetDefinition && presetDefinition.templateKey === template.trim()
        ? suggestPathBaseFromPreset(presetKey, availablePresets)
        : suggestPathBaseFromTemplate(template);
    return buildUniqueWebsitePath(basePath, existingPaths);
  }, [
    existingPagesData?.items,
    isEdit,
    locale,
    presetKey,
    resolvePreset,
    template,
    availablePresets,
  ]);

  useEffect(() => {
    if (isEdit) {
      return;
    }
    if (hasEditedPath && path.trim().length > 0) {
      return;
    }
    setPath(suggestedPath);
  }, [hasEditedPath, isEdit, path, suggestedPath]);

  const handlePathChange = (nextPath: string) => {
    setHasEditedPath(true);
    setPath(nextPath);
  };

  const canSave = path.trim().length > 0 && locale.trim().length > 0 && template.trim().length > 0;

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

  const {
    updateSelectedBlockField,
    commitJsonFieldDraft,
    uploadFilesToField,
    addBlock,
    duplicateBlock,
    removeBlock,
    toggleBlockEnabled,
    handleDropBlock,
  } = createWebsitePageEditorBlockActions({
    content,
    setContent,
    selectedBlock,
    selectedDefinition,
    selectedBlockId,
    setSelectedBlockId,
    dragBlockId,
    setDragBlockId,
    jsonFieldDrafts,
    setJsonFieldDrafts,
    setUploadingFieldKey,
    newBlockType,
    setIsAddBlockOpen,
  });

  const previewUrl = useMemo(() => {
    const site = siteData?.site;
    if (!site || !activeWorkspace?.slug) {
      return null;
    }
    const localizedPreviewPath = buildLocalizedPreviewPath(path, locale);
    return getPublicWebsiteUrl({
      workspaceSlug: activeWorkspace.slug,
      websiteSlug: site.slug,
      isDefault: site.isDefault,
      path: localizedPreviewPath,
    });
  }, [activeWorkspace?.slug, locale, path, siteData?.site]);

  const openPreview = () => {
    if (!previewUrl) {
      toast.error("Preview URL is unavailable.");
      return;
    }
    openWebsitePreviewWindow(previewUrl);
  };

  const { savePresetPending, handleSaveAsPreset } = useWebsitePageEditorSavePreset({
    resolvedSiteId,
    site: siteData?.site,
    content,
    template,
    path,
    locale,
    queryClient,
    onPresetSaved: setPresetKey,
  });

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <WebsitePageEditorHeader
        isEdit={isEdit}
        status={status}
        canSave={canSave}
        savePending={saveMutation.isPending}
        onBack={() => navigate(-1)}
        onPublish={() => void publishMutation.mutate()}
        onUnpublish={() => void unpublishMutation.mutate()}
        onSave={() => void saveMutation.mutate()}
      />

      <WebsitePageEditorDetailsCard
        isEdit={isEdit}
        path={path}
        onPathChange={handlePathChange}
        locale={locale}
        onLocaleChange={setLocale}
        presetKey={presetKey}
        onPresetChange={(nextPresetKey) => {
          const presetDefinition = resolvePreset(nextPresetKey);
          setPresetKey(presetDefinition.presetKey);
          setTemplate(presetDefinition.templateKey);
          if (!isEdit) {
            setLocale(presetDefinition.defaultLocale);
          }
          const next = buildDefaultContentForPreset(presetDefinition.presetKey, availablePresets);
          setContent(next);
          setSelectedBlockId(next.blocks[0]?.id ?? null);
          setJsonFieldDrafts({});
        }}
        availablePresets={availablePresets.map((preset) => ({
          presetKey: preset.presetKey,
          label: preset.label,
          templateKey: preset.templateKey,
        }))}
        template={template}
        onTemplateChange={(nextTemplate) => {
          setTemplate(nextTemplate);
          if (!isEdit) {
            const defaultPresetForTemplate = resolveDefaultPresetForTemplate(nextTemplate);
            const nextPresetKey = defaultPresetForTemplate?.presetKey ?? presetKey;
            setPresetKey(nextPresetKey);
            const next = defaultPresetForTemplate
              ? buildDefaultContentForPreset(nextPresetKey, availablePresets)
              : buildDefaultContentForTemplate(nextTemplate);
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
        canSaveAsPreset={Boolean(resolvedSiteId) && Boolean(content)}
        saveAsPresetPending={savePresetPending}
        onSaveAsPreset={handleSaveAsPreset}
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
          const next = isEdit
            ? buildDefaultContentForTemplate(template)
            : buildDefaultContentForPreset(presetKey, availablePresets);
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
        renderSelectedBlockPreview={() => renderWebsitePageBlockPreview(selectedBlock, template)}
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
