import type React from "react";
import type { WebsiteBlock, WebsiteBlockType } from "@corely/contracts";
import type { WebsiteRenderContext } from "../runtime.types";

export type BlockEditorField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "boolean" | "json" | "fileId" | "fileIdList";
};

export type BlockDefinition = {
  type: WebsiteBlockType;
  schema: {
    safeParse: (value: unknown) => { success: true; data: WebsiteBlock } | { success: false };
  };
  renderer: React.ComponentType<{ block: WebsiteBlock; context?: WebsiteRenderContext }>;
  editor: {
    label: string;
    description: string;
    defaultProps: Record<string, unknown>;
    fields: BlockEditorField[];
  };
  migrations?: Array<(block: WebsiteBlock) => WebsiteBlock>;
};

export const NAIL_STUDIO_TEMPLATE_KEY = "landing.nailstudio.v1";

export const toSectionCommonFields = (): BlockEditorField[] => [
  { key: "anchorId", label: "Anchor ID", type: "text" },
  { key: "className", label: "Class Name", type: "text" },
  { key: "variant", label: "Variant", type: "text" },
  { key: "hiddenOn.mobile", label: "Hide on Mobile", type: "boolean" },
  { key: "hiddenOn.desktop", label: "Hide on Desktop", type: "boolean" },
];

export const createDefinition = (input: {
  type: WebsiteBlockType;
  schema: BlockDefinition["schema"];
  label: string;
  description: string;
  renderer: BlockDefinition["renderer"];
  defaultProps?: Record<string, unknown>;
  fields?: BlockEditorField[];
}): BlockDefinition => ({
  type: input.type,
  schema: input.schema,
  renderer: input.renderer,
  editor: {
    label: input.label,
    description: input.description,
    defaultProps: input.defaultProps ?? {},
    fields: input.fields ?? toSectionCommonFields(),
  },
});

export const toComponentProps = <T extends object>(value: unknown): T => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as T;
  }
  return value as T;
};

export const isNailStudioTemplate = (context?: WebsiteRenderContext): boolean =>
  context?.templateKey === NAIL_STUDIO_TEMPLATE_KEY;
