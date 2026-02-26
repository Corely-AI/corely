import { useMutation, type QueryClient } from "@tanstack/react-query";
import type { WebsitePageContent, WebsiteSiteWithSettings } from "@corely/contracts";
import { toast } from "sonner";
import { websiteApi } from "@/lib/website-api";
import { websiteSiteKeys } from "../queries";
import { WebsitePageEditorPresetRegistry } from "./website-page-editor-preset-registry";
import {
  createPresetKeyFromLabel,
  normalizePresetKeyInput,
  upsertSiteStoredPreset,
} from "./website-page-editor-site-presets";
import { suggestPathBaseFromTemplate } from "./website-page-editor.utils";

const CUSTOM_PRESET_KEY_REGEX = /^[a-z][a-z0-9._-]*$/;

type UseWebsitePageEditorSavePresetParams = {
  resolvedSiteId?: string;
  site?: WebsiteSiteWithSettings;
  content: WebsitePageContent | null;
  template: string;
  path: string;
  locale: string;
  queryClient: QueryClient;
  onPresetSaved: (presetKey: string) => void;
};

export const useWebsitePageEditorSavePreset = (params: UseWebsitePageEditorSavePresetParams) => {
  const savePresetMutation = useMutation({
    mutationFn: async (input: { presetKey: string; label: string; description?: string }) => {
      if (!params.resolvedSiteId || !params.site) {
        throw new Error("Save the page first before storing presets.");
      }
      if (!params.content) {
        throw new Error("No page content to save as preset.");
      }
      if (WebsitePageEditorPresetRegistry.get(input.presetKey)) {
        throw new Error("Preset key is reserved by a built-in preset.");
      }

      const { nextCustomSettings, savedPreset } = upsertSiteStoredPreset({
        customSettings: params.site.settings?.custom,
        preset: {
          presetKey: input.presetKey,
          label: input.label,
          description: input.description,
          templateKey: params.template.trim(),
          suggestedPathBase: params.path.trim() || suggestPathBaseFromTemplate(params.template),
          defaultLocale: params.locale.trim() || params.site.defaultLocale,
          content: params.content,
          updatedAt: new Date().toISOString(),
        },
      });

      await websiteApi.updateSite(params.resolvedSiteId, {
        custom: nextCustomSettings,
      });

      return { nextCustomSettings, savedPreset };
    },
    onSuccess: ({ nextCustomSettings, savedPreset }) => {
      toast.success("Preset saved to this website.");
      params.onPresetSaved(savedPreset.presetKey);
      const key = websiteSiteKeys.detail(params.resolvedSiteId ?? "");
      params.queryClient.setQueryData<{ site: WebsiteSiteWithSettings } | null>(key, (current) => {
        if (!current?.site) {
          return current;
        }
        return {
          ...current,
          site: {
            ...current.site,
            settings: {
              ...current.site.settings,
              custom: nextCustomSettings,
            },
          },
        };
      });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to save preset");
    },
  });

  const handleSaveAsPreset = () => {
    if (savePresetMutation.isPending) {
      return;
    }
    const defaultLabel = params.content?.blocks[0]?.type
      ? `${params.content.blocks[0].type} preset`
      : "New preset";
    const labelInput = window.prompt("Preset name", defaultLabel);
    if (labelInput === null) {
      return;
    }
    const label = labelInput.trim();
    if (!label) {
      toast.error("Preset name is required.");
      return;
    }

    const defaultKey = createPresetKeyFromLabel(label);
    const keyInput = window.prompt("Preset key", defaultKey);
    if (keyInput === null) {
      return;
    }
    const presetKeyInput = normalizePresetKeyInput(keyInput);
    if (!CUSTOM_PRESET_KEY_REGEX.test(presetKeyInput)) {
      toast.error("Preset key must start with a letter and contain only a-z, 0-9, ., _, -.");
      return;
    }

    const descriptionInput = window.prompt("Preset description (optional)", "");
    void savePresetMutation.mutate({
      presetKey: presetKeyInput,
      label,
      description: descriptionInput?.trim() || undefined,
    });
  };

  return {
    savePresetPending: savePresetMutation.isPending,
    handleSaveAsPreset,
  };
};
