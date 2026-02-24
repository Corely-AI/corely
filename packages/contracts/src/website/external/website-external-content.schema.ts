import { z } from "zod";
import { SiteCopySchema, type SiteCopy } from "./site-copy.schema";

export const WebsiteExternalContentKeySchema = z.enum(["siteCopy"]);
export type WebsiteExternalContentKey = z.infer<typeof WebsiteExternalContentKeySchema>;

export const WebsiteExternalContentVersionSchema = z.enum(["draft", "published"]);
export type WebsiteExternalContentVersion = z.infer<typeof WebsiteExternalContentVersionSchema>;

export const WebsiteExternalContentEnvelopeSchema = z.object({
  key: WebsiteExternalContentKeySchema,
  locale: z.string().min(2).max(16).optional(),
  version: WebsiteExternalContentVersionSchema,
  updatedAt: z.string().datetime(),
  data: z.unknown(),
});
export type WebsiteExternalContentEnvelope = z.infer<typeof WebsiteExternalContentEnvelopeSchema>;

export type WebsiteExternalContentDataByKey = {
  siteCopy: SiteCopy;
};

export const WebsiteExternalContentDataSchemaMap = {
  siteCopy: SiteCopySchema,
} as const satisfies Record<WebsiteExternalContentKey, z.ZodType<unknown>>;

const WebsiteExternalSiteCopyEnvelopeSchema = WebsiteExternalContentEnvelopeSchema.extend({
  key: z.literal("siteCopy"),
  data: SiteCopySchema,
});

export const WebsiteExternalContentEnvelopeByKeySchema = z.discriminatedUnion("key", [
  WebsiteExternalSiteCopyEnvelopeSchema,
]);
export type WebsiteExternalContentEnvelopeByKey = z.infer<
  typeof WebsiteExternalContentEnvelopeByKeySchema
>;

export const parseWebsiteExternalContentData = <K extends WebsiteExternalContentKey>(
  key: K,
  data: unknown
): WebsiteExternalContentDataByKey[K] => {
  const schema = WebsiteExternalContentDataSchemaMap[key] as z.ZodType<
    WebsiteExternalContentDataByKey[K]
  >;
  return schema.parse(data);
};

export const parseWebsiteExternalContentEnvelopeByKey = (
  envelope: WebsiteExternalContentEnvelope
): WebsiteExternalContentEnvelopeByKey => {
  const validatedData = parseWebsiteExternalContentData(envelope.key, envelope.data);
  return WebsiteExternalContentEnvelopeByKeySchema.parse({ ...envelope, data: validatedData });
};

export const GetWebsiteExternalContentDraftInputSchema = z.object({
  key: WebsiteExternalContentKeySchema,
  locale: z.string().min(2).max(16).optional(),
});
export type GetWebsiteExternalContentDraftInput = z.infer<
  typeof GetWebsiteExternalContentDraftInputSchema
>;

export const PatchWebsiteExternalContentDraftInputSchema = z.object({
  key: WebsiteExternalContentKeySchema,
  locale: z.string().min(2).max(16).optional(),
  data: z.unknown(),
});
export type PatchWebsiteExternalContentDraftInput = z.infer<
  typeof PatchWebsiteExternalContentDraftInputSchema
>;

export const PublishWebsiteExternalContentInputSchema = z.object({
  key: WebsiteExternalContentKeySchema,
  locale: z.string().min(2).max(16).optional(),
});
export type PublishWebsiteExternalContentInput = z.infer<
  typeof PublishWebsiteExternalContentInputSchema
>;

export const GetPublicWebsiteExternalContentInputSchema = z.object({
  siteId: z.string().min(1),
  key: WebsiteExternalContentKeySchema,
  locale: z.string().min(2).max(16).optional(),
  mode: z.enum(["live", "preview"]).default("live"),
  previewToken: z.string().optional(),
});
export type GetPublicWebsiteExternalContentInput = z.infer<
  typeof GetPublicWebsiteExternalContentInputSchema
>;

export const WebsiteExternalContentOutputSchema = WebsiteExternalContentEnvelopeByKeySchema;
export type WebsiteExternalContentOutput = z.infer<typeof WebsiteExternalContentOutputSchema>;
