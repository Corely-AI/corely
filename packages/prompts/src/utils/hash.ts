import { createHash } from "crypto";

export const RENDER_ENGINE_VERSION = "1";

export const hashPromptTemplate = (template: string, version: string) =>
  createHash("sha256").update(`${version}\n${template}\n${RENDER_ENGINE_VERSION}`).digest("hex");

export const hashPromptRender = (templateHash: string, variables: Record<string, unknown>) => {
  return createHash("sha256")
    .update(`${templateHash}\n${stableStringify(variables)}`)
    .digest("hex");
};

export const stableStringify = (value: unknown): string => {
  if (value === null || value === undefined) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    return `{${entries
      .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};
