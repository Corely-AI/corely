import {
  type PromptRenderResult,
  type PromptVersionDefinition,
  type PromptVariableKind,
} from "../types";
import { RENDER_ENGINE_VERSION } from "./hash";
import { stableStringify } from "./hash";

const placeholderRegex = /\{\{\{([A-Za-z0-9_]+)\}\}\}|\{\{([A-Za-z0-9_]+)\}\}/g;

type Placeholder = {
  raw: string;
  key: string;
  isBlock: boolean;
};

const extractPlaceholders = (template: string): Placeholder[] => {
  const matches: Placeholder[] = [];
  for (const match of template.matchAll(placeholderRegex)) {
    const blockKey = match[1];
    const textKey = match[2];
    const key = blockKey ?? textKey ?? "";
    const isBlock = Boolean(blockKey);
    matches.push({ raw: match[0], key, isBlock });
  }
  return matches;
};

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .replace(/\r?\n/g, " ")
    .trim();
const normalizeBlock = (value: unknown) => String(value ?? "");

const renderValue = (key: string, kind: PromptVariableKind, value: unknown) => {
  if (kind === "json") {
    if (typeof value === "string") {
      return value;
    }
    return stableStringify(value ?? null);
  }
  if (kind === "block") {
    const body = normalizeBlock(value);
    return `<<${key}>>\n${body}\n<<END:${key}>>`;
  }
  return normalizeText(value);
};

const resolveVariableKind = (
  key: string,
  placeholders: Placeholder[],
  declared?: PromptVariableKind
): PromptVariableKind => {
  if (declared) {
    return declared;
  }
  const placeholder = placeholders.find((item) => item.key === key);
  return placeholder?.isBlock ? "block" : "text";
};

export const renderPrompt = (
  promptId: string,
  version: PromptVersionDefinition,
  variables: Record<string, unknown>
): PromptRenderResult => {
  const parsed = version.variablesSchema.parse(variables ?? {});
  const template = version.template;
  const placeholders = extractPlaceholders(template);

  const declaredVariables = version.variables ?? [];
  const declaredKeys = new Set(declaredVariables.map((item) => item.key));
  const placeholderKeys = new Set(placeholders.map((item) => item.key));

  if (placeholders.length > 0 && declaredVariables.length === 0) {
    throw new Error(`Prompt ${promptId}@${version.version} is missing variable declarations`);
  }

  for (const key of placeholderKeys) {
    if (!declaredKeys.has(key)) {
      throw new Error(`Prompt ${promptId}@${version.version} missing variable spec for ${key}`);
    }
  }

  for (const key of declaredKeys) {
    if (!placeholderKeys.has(key)) {
      throw new Error(`Prompt ${promptId}@${version.version} declares unused variable ${key}`);
    }
  }

  let rendered = template;
  for (const variable of declaredVariables) {
    const kind = resolveVariableKind(variable.key, placeholders, variable.kind);
    const value = renderValue(variable.key, kind, parsed[variable.key]);
    const placeholder = kind === "block" ? `{{{${variable.key}}}}` : `{{${variable.key}}}`;
    rendered = rendered.split(placeholder).join(value);
  }

  placeholderRegex.lastIndex = 0;
  if (placeholderRegex.test(rendered)) {
    throw new Error(`Prompt ${promptId}@${version.version} contains unresolved placeholders`);
  }

  return {
    promptId,
    promptVersion: version.version,
    promptHash: "",
    renderEngineVersion: RENDER_ENGINE_VERSION,
    template,
    content: rendered,
    variables: parsed,
  };
};
