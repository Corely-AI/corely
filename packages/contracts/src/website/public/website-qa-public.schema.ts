import { z } from "zod";

const normalizePublicPath = (rawPath: string): string => {
  const trimmed = rawPath.trim();
  if (!trimmed) {
    return "/";
  }

  const withoutQueryOrHash = trimmed.split("?")[0]?.split("#")[0] ?? trimmed;
  const withLeadingSlash = withoutQueryOrHash.startsWith("/")
    ? withoutQueryOrHash
    : `/${withoutQueryOrHash}`;

  if (withLeadingSlash.length > 1 && withLeadingSlash.endsWith("/")) {
    return withLeadingSlash.slice(0, -1);
  }

  return withLeadingSlash;
};

const normalizeHostname = (rawHost: string): string => {
  const trimmed = rawHost.trim().toLowerCase();
  if (!trimmed) {
    return trimmed;
  }

  const withoutScheme = trimmed.replace(/^https?:\/\//, "");
  const withoutPath = withoutScheme.split("/")[0] ?? withoutScheme;
  return withoutPath.split(":")[0] ?? withoutPath;
};

export const WebsiteQaScopeSchema = z.enum(["site", "page"]);
export type WebsiteQaScope = z.infer<typeof WebsiteQaScopeSchema>;

export const ListWebsiteQaInputSchema = z.object({
  hostname: z.string().min(1).transform(normalizeHostname),
  path: z.string().min(1).transform(normalizePublicPath),
  locale: z.string().trim().min(1).optional(),
  scope: WebsiteQaScopeSchema.default("site"),
});
export type ListWebsiteQaInput = z.infer<typeof ListWebsiteQaInputSchema>;

export const ListWebsiteQaOutputSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      question: z.string(),
      answerHtml: z.string(),
      order: z.number().int(),
      updatedAt: z.string(),
    })
  ),
});
export type ListWebsiteQaOutput = z.infer<typeof ListWebsiteQaOutputSchema>;
