import { CopilotUIPartSchema } from "@corely/contracts";
import { type z } from "zod";

type CopilotPart = z.infer<typeof CopilotUIPartSchema>;

const MAX_TITLE_LENGTH = 80;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const normalizeThreadTitle = (value: string | null | undefined): string => {
  if (!value) {
    return "New chat";
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "New chat";
  }
  return trimmed;
};

export const createThreadTitleFromText = (value: string): string => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "New chat";
  }
  return normalized.length > MAX_TITLE_LENGTH
    ? `${normalized.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…`
    : normalized;
};

export const parseStoredMessage = (
  raw: string
): {
  parts: CopilotPart[];
  content?: string;
  metadata?: Record<string, unknown>;
} => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      const validated = CopilotUIPartSchema.array().safeParse(parsed);
      return {
        parts: validated.success ? validated.data : [],
      };
    }

    if (isRecord(parsed)) {
      const parts = Array.isArray(parsed.parts) ? parsed.parts : [];
      const validated = CopilotUIPartSchema.array().safeParse(parts);
      return {
        parts: validated.success ? validated.data : [],
        content: typeof parsed.content === "string" ? parsed.content : undefined,
        metadata: isRecord(parsed.metadata) ? parsed.metadata : undefined,
      };
    }

    return { parts: [] };
  } catch {
    return { parts: [] };
  }
};

const extractPlainTextFromParts = (parts: CopilotPart[]): string => {
  const chunks: string[] = [];
  for (const part of parts) {
    if (part.type === "text" && "text" in part && typeof part.text === "string") {
      chunks.push(part.text);
    }
  }
  return chunks.join(" ").replace(/\s+/g, " ").trim();
};

export const resolveMessageText = (params: {
  contentText: string | null;
  partsJson: string;
}): string => {
  const fromColumn = params.contentText?.trim();
  if (fromColumn) {
    return fromColumn;
  }

  const parsed = parseStoredMessage(params.partsJson);
  if (parsed.content?.trim()) {
    return parsed.content.trim();
  }

  return extractPlainTextFromParts(parsed.parts);
};

export const buildSearchSnippet = (text: string, query: string): string => {
  const normalizedText = text.replace(/\s+/g, " ").trim();
  if (!normalizedText) {
    return "";
  }

  const lowerText = normalizedText.toLocaleLowerCase();
  const lowerQuery = query.trim().toLocaleLowerCase();
  if (!lowerQuery) {
    return normalizedText.slice(0, 140);
  }

  const startIndex = lowerText.indexOf(lowerQuery);
  if (startIndex < 0) {
    return normalizedText.slice(0, 140);
  }

  const snippetStart = Math.max(0, startIndex - 40);
  const snippetEnd = Math.min(normalizedText.length, startIndex + lowerQuery.length + 80);
  const snippet = normalizedText.slice(snippetStart, snippetEnd).trim();

  const prefix = snippetStart > 0 ? "…" : "";
  const suffix = snippetEnd < normalizedText.length ? "…" : "";
  return `${prefix}${snippet}${suffix}`;
};
