import type { WebsitePageContent } from "@corely/contracts";
import { WebsiteTemplateEditorRegistry } from "../blocks/website-block-editor-registry";
import { buildNailStudioVietDePresetContent } from "./website-page-editor-preset-nail-vietde";

export type WebsitePageEditorPresetDefinition = {
  presetKey: string;
  label: string;
  description: string;
  templateKey: string;
  suggestedPathBase: string;
  defaultLocale: string;
  isTemplateDefault?: boolean;
  defaultContent: () => WebsitePageContent;
};

const buildTemplateDefaultContent = (templateKey: string): WebsitePageContent => {
  const templateDefinition =
    WebsiteTemplateEditorRegistry.get(templateKey) ?? WebsiteTemplateEditorRegistry.fallback();
  return templateDefinition.defaultContent();
};

const presetDefinitions: WebsitePageEditorPresetDefinition[] = [
  {
    presetKey: "landing-tutoring-default.v1",
    label: "Tutoring Landing (Default)",
    description: "Default tutoring starter content.",
    templateKey: "landing.tutoring.v1",
    suggestedPathBase: "/tutoring",
    defaultLocale: "en-US",
    isTemplateDefault: true,
    defaultContent: () => buildTemplateDefaultContent("landing.tutoring.v1"),
  },
  {
    presetKey: "landing-nailstudio-default.v1",
    label: "Nail Studio Landing (Default)",
    description: "Default nail studio starter content.",
    templateKey: "landing.nailstudio.v1",
    suggestedPathBase: "/nailstudio",
    defaultLocale: "en-US",
    isTemplateDefault: true,
    defaultContent: () => buildTemplateDefaultContent("landing.nailstudio.v1"),
  },
  {
    presetKey: "landing-nailstudio-vietde.v1",
    label: "Nails Viet in Germany",
    description: "VN-first copy for Vietnamese nail owners in Germany.",
    templateKey: "landing.nailstudio.v1",
    suggestedPathBase: "/nails-viet-de",
    defaultLocale: "vi-VN",
    defaultContent: buildNailStudioVietDePresetContent,
  },
];

const presetsByKey = new Map<string, WebsitePageEditorPresetDefinition>(
  presetDefinitions.map((preset) => [preset.presetKey, preset])
);

const findDefaultForTemplate = (templateKey: string): WebsitePageEditorPresetDefinition | null => {
  const normalizedTemplate = templateKey.trim();
  const markedDefault = presetDefinitions.find(
    (preset) => preset.templateKey === normalizedTemplate && preset.isTemplateDefault
  );
  if (markedDefault) {
    return markedDefault;
  }
  return presetDefinitions.find((preset) => preset.templateKey === normalizedTemplate) ?? null;
};

const fallbackPreset =
  presetDefinitions.find(
    (preset) => preset.isTemplateDefault && preset.templateKey === "landing.tutoring.v1"
  ) ?? presetDefinitions[0];

if (!fallbackPreset) {
  throw new Error("WebsitePageEditorPresetRegistry requires at least one preset.");
}

export const WebsitePageEditorPresetRegistry = {
  get(presetKey: string): WebsitePageEditorPresetDefinition | null {
    return presetsByKey.get(presetKey) ?? null;
  },
  all(): WebsitePageEditorPresetDefinition[] {
    return [...presetDefinitions];
  },
  fallback(): WebsitePageEditorPresetDefinition {
    return fallbackPreset;
  },
  defaultForTemplate(templateKey: string): WebsitePageEditorPresetDefinition | null {
    return findDefaultForTemplate(templateKey);
  },
};
