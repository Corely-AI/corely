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

export const PublicSiteRefSchema = z
  .object({
    hostname: z.string().min(1).transform(normalizeHostname),
    path: z.string().min(1).transform(normalizePublicPath),
    locale: z.string().trim().min(1).optional(),
    mode: z.enum(["live", "preview"]).default("live"),
    token: z.string().trim().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.mode === "preview" && !value.token) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["token"],
        message: "token is required when mode is preview",
      });
    }
  });

export type PublicSiteRef = z.infer<typeof PublicSiteRefSchema>;
