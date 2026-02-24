import type { Dispatch, SetStateAction } from "react";
import type { WebsiteBlock, WebsiteBlockType, WebsitePageContent } from "@corely/contracts";
import { toast } from "sonner";
import { cmsApi } from "@/lib/cms-api";
import {
  WebsiteBlockEditorRegistry,
  type WebsiteBlockEditorDefinition,
  type WebsiteBlockEditorField,
} from "../blocks/website-block-editor-registry";
import {
  createBlockId,
  getValueAtPath,
  normalizeFileIdList,
  reorderBlocks,
  setValueAtPath,
} from "./website-page-editor.utils";

type CreateWebsitePageEditorBlockActionsInput = {
  content: WebsitePageContent | null;
  setContent: Dispatch<SetStateAction<WebsitePageContent | null>>;
  selectedBlock: WebsiteBlock | null;
  selectedDefinition: WebsiteBlockEditorDefinition | null;
  selectedBlockId: string | null;
  setSelectedBlockId: Dispatch<SetStateAction<string | null>>;
  dragBlockId: string | null;
  setDragBlockId: Dispatch<SetStateAction<string | null>>;
  jsonFieldDrafts: Record<string, string>;
  setJsonFieldDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  setUploadingFieldKey: Dispatch<SetStateAction<string | null>>;
  newBlockType: WebsiteBlockType;
  setIsAddBlockOpen: Dispatch<SetStateAction<boolean>>;
};

export const createWebsitePageEditorBlockActions = (
  input: CreateWebsitePageEditorBlockActionsInput
) => {
  const resolveFieldStateKey = (fieldKey: string): string =>
    input.selectedBlock ? `${input.selectedBlock.id}:${fieldKey}` : fieldKey;

  const updateSelectedBlockField = (field: WebsiteBlockEditorField, value: unknown) => {
    if (!input.content || !input.selectedBlock) {
      return;
    }

    input.setContent({
      ...input.content,
      blocks: input.content.blocks.map((block) => {
        if (block.id !== input.selectedBlock?.id) {
          return block;
        }

        const nextProps = setValueAtPath({ ...block.props }, field.key, value);
        const parsed = input.selectedDefinition?.schema.safeParse({
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

  const commitJsonFieldDraft = (field: WebsiteBlockEditorField) => {
    if (!input.selectedBlock) {
      return;
    }
    const stateKey = resolveFieldStateKey(field.key);
    const draft = input.jsonFieldDrafts[stateKey];
    if (draft === undefined) {
      return;
    }
    const trimmed = draft.trim();
    if (!trimmed) {
      updateSelectedBlockField(field, undefined);
      input.setJsonFieldDrafts((current) => {
        const next = { ...current };
        delete next[stateKey];
        return next;
      });
      return;
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      updateSelectedBlockField(field, parsed);
      input.setJsonFieldDrafts((current) => {
        const next = { ...current };
        delete next[stateKey];
        return next;
      });
    } catch {
      toast.error("Invalid JSON for this field.");
    }
  };

  const uploadFilesToField = async (field: WebsiteBlockEditorField, files: FileList | null) => {
    if (!input.selectedBlock || !files || files.length === 0) {
      return;
    }

    const stateKey = resolveFieldStateKey(field.key);
    input.setUploadingFieldKey(stateKey);
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
        const currentValue = getValueAtPath(input.selectedBlock.props, field.key);
        const merged = Array.from(
          new Set([...normalizeFileIdList(currentValue), ...uploadedFileIds])
        );
        updateSelectedBlockField(field, merged);
      }
      toast.success("Image uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      input.setUploadingFieldKey(null);
    }
  };

  const addBlock = () => {
    if (!input.content) {
      return;
    }

    const definition = WebsiteBlockEditorRegistry.get(input.newBlockType);
    const nextBlockCandidate = {
      id: createBlockId(input.newBlockType),
      type: input.newBlockType,
      enabled: true,
      props: { ...definition.defaultProps },
    };
    const parsed = definition.schema.safeParse(nextBlockCandidate);
    if (!parsed.success) {
      toast.error("Block defaults are invalid.");
      return;
    }

    const next = {
      ...input.content,
      blocks: [...input.content.blocks, parsed.data],
    };
    input.setContent(next);
    input.setSelectedBlockId(parsed.data.id);
    input.setIsAddBlockOpen(false);
  };

  const duplicateBlock = (block: WebsiteBlock) => {
    if (!input.content) {
      return;
    }
    const nextBlock: WebsiteBlock = {
      ...block,
      id: createBlockId(block.type),
      props: { ...(block.props as Record<string, unknown>) },
    };
    input.setContent({
      ...input.content,
      blocks: [...input.content.blocks, nextBlock],
    });
    input.setSelectedBlockId(nextBlock.id);
  };

  const removeBlock = (blockId: string) => {
    if (!input.content) {
      return;
    }
    const nextBlocks = input.content.blocks.filter((block) => block.id !== blockId);
    input.setContent({ ...input.content, blocks: nextBlocks });
    if (input.selectedBlockId === blockId) {
      input.setSelectedBlockId(nextBlocks[0]?.id ?? null);
    }
  };

  const toggleBlockEnabled = (blockId: string, enabled: boolean) => {
    if (!input.content) {
      return;
    }
    input.setContent({
      ...input.content,
      blocks: input.content.blocks.map((block) =>
        block.id === blockId ? { ...block, enabled } : block
      ),
    });
  };

  const handleDropBlock = (targetId: string) => {
    if (!input.content || !input.dragBlockId) {
      return;
    }
    input.setContent({
      ...input.content,
      blocks: reorderBlocks(input.content.blocks, input.dragBlockId, targetId),
    });
    input.setDragBlockId(null);
  };

  return {
    updateSelectedBlockField,
    commitJsonFieldDraft,
    uploadFilesToField,
    addBlock,
    duplicateBlock,
    removeBlock,
    toggleBlockEnabled,
    handleDropBlock,
  };
};
