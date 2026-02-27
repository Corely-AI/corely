import { useMutation, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { NavigateFunction } from "react-router-dom";
import type { WebsiteBlock, WebsitePageContent, WebsitePageStatus } from "@corely/contracts";
import { WebsitePageContentSchema } from "@corely/contracts";
import { ApiError, normalizeError } from "@corely/api-client";
import { websiteApi } from "@/lib/website-api";
import { invalidateResourceQueries } from "@/shared/crud";
import { websitePageContentKeys, websitePageKeys, websitePageListKey } from "../queries";
import { cloneContent } from "./website-page-editor.utils";

type UseWebsitePageEditorMutationsParams = {
  isEdit: boolean;
  pageId?: string;
  siteId?: string;
  path: string;
  locale: string;
  template: string;
  cmsEntryId: string;
  seoTitle: string;
  seoDescription: string;
  seoImageFileId: string;
  queryClient: QueryClient;
  navigate: NavigateFunction;
  resolvedSiteId?: string;
  content: WebsitePageContent | null;
  aiBrief: string;
  selectedBlock: WebsiteBlock | null;
  aiInstruction: string;
  setContent: React.Dispatch<React.SetStateAction<WebsitePageContent | null>>;
  setSelectedBlockId: React.Dispatch<React.SetStateAction<string | null>>;
  setStatus: React.Dispatch<React.SetStateAction<WebsitePageStatus>>;
};

const resolveSavePageErrorMessage = (error: unknown): string => {
  const apiError = error instanceof ApiError ? error : normalizeError(error);
  if (apiError.code === "Website:PagePathTaken") {
    return "Path already exists for this locale. Pick a different path and save again.";
  }
  return apiError.detail || "Failed to save page";
};

export const useWebsitePageEditorMutations = (params: UseWebsitePageEditorMutationsParams) => {
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        path: params.path.trim(),
        locale: params.locale.trim(),
        templateKey: params.template.trim(),
        cmsEntryId: params.cmsEntryId.trim() || undefined,
        seoTitle: params.seoTitle.trim() || undefined,
        seoDescription: params.seoDescription.trim() || undefined,
        seoImageFileId: params.seoImageFileId.trim() || undefined,
      };
      if (params.isEdit && params.pageId) {
        return websiteApi.updatePage(params.pageId, payload);
      }
      if (!params.siteId) {
        throw new Error("Missing siteId");
      }
      const parsedContent = params.content
        ? WebsitePageContentSchema.safeParse({
            ...params.content,
            templateKey: params.content.templateKey || params.template.trim(),
          })
        : null;
      if (parsedContent && !parsedContent.success) {
        throw new Error(parsedContent.error.issues[0]?.message || "Invalid block content");
      }
      return websiteApi.createPage(params.siteId, {
        ...payload,
        siteId: params.siteId,
        content: parsedContent?.data,
      });
    },
    onSuccess: (saved) => {
      void invalidateResourceQueries(params.queryClient, "website-pages");
      toast.success(params.isEdit ? "Page updated" : "Page created");
      if (!params.isEdit) {
        params.navigate(`/website/pages/${saved.id}/edit`);
      }
    },
    onError: (err: unknown) => {
      toast.error(resolveSavePageErrorMessage(err));
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      if (!params.pageId || !params.content) {
        throw new Error("Save the page first before editing blocks.");
      }
      const parsed = WebsitePageContentSchema.safeParse({
        ...params.content,
        templateKey: params.content.templateKey || params.template.trim(),
      });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message || "Invalid block content");
      }
      return websiteApi.updatePageContent(params.pageId, parsed.data);
    },
    onSuccess: (result) => {
      toast.success("Draft blocks saved");
      params.setContent(cloneContent(result.content));
      void params.queryClient.invalidateQueries({
        queryKey: websitePageContentKeys.detail(params.pageId ?? ""),
      });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to save draft blocks");
    },
  });

  const generateBlocksMutation = useMutation({
    mutationFn: async () => {
      if (!params.content) {
        throw new Error("No content loaded");
      }
      return websiteApi.generateBlocks({
        templateKey: params.content.templateKey,
        locale: params.locale.trim(),
        brief: params.aiBrief.trim() || "Refresh blocks",
        existingBlocks: params.content.blocks,
      });
    },
    onSuccess: (result) => {
      params.setContent(cloneContent(result.content));
      params.setSelectedBlockId(result.content.blocks[0]?.id ?? null);
      toast.success("AI blocks generated");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to generate blocks");
    },
  });

  const regenerateBlockMutation = useMutation({
    mutationFn: async () => {
      if (!params.content || !params.selectedBlock) {
        throw new Error("Select a block first");
      }
      return websiteApi.regenerateBlock({
        templateKey: params.content.templateKey,
        blockType: params.selectedBlock.type,
        currentBlock: params.selectedBlock,
        instruction: params.aiInstruction.trim() || "Refine this block",
      });
    },
    onSuccess: (result) => {
      if (!params.content || !params.selectedBlock) {
        return;
      }
      params.setContent({
        ...params.content,
        blocks: params.content.blocks.map((block) =>
          block.id === params.selectedBlock?.id ? result.block : block
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
      if (!params.pageId) {
        throw new Error("Missing pageId");
      }
      return websiteApi.publishPage(params.pageId);
    },
    onSuccess: (result) => {
      toast.success("Page published");
      params.setStatus(result.page.status);
      void params.queryClient.invalidateQueries({
        queryKey: websitePageKeys.detail(params.pageId ?? ""),
      });
      void params.queryClient.invalidateQueries({
        queryKey: websitePageListKey({ siteId: params.resolvedSiteId }),
      });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to publish page");
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async () => {
      if (!params.pageId) {
        throw new Error("Missing pageId");
      }
      return websiteApi.unpublishPage(params.pageId);
    },
    onSuccess: (result) => {
      toast.success("Page unpublished");
      params.setStatus(result.page.status);
      void params.queryClient.invalidateQueries({
        queryKey: websitePageKeys.detail(params.pageId ?? ""),
      });
      void params.queryClient.invalidateQueries({
        queryKey: websitePageListKey({ siteId: params.resolvedSiteId }),
      });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to unpublish page");
    },
  });

  return {
    saveMutation,
    saveDraftMutation,
    generateBlocksMutation,
    regenerateBlockMutation,
    publishMutation,
    unpublishMutation,
  };
};
