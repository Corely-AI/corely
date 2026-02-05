import { z } from "zod";
import { WebsitePageSchema, WebsitePageSnapshotSchema } from "./website.types";

export const PublishWebsitePageOutputSchema = z.object({
  page: WebsitePageSchema,
  snapshot: WebsitePageSnapshotSchema,
});
export type PublishWebsitePageOutput = z.infer<typeof PublishWebsitePageOutputSchema>;

export const UnpublishWebsitePageOutputSchema = z.object({
  page: WebsitePageSchema,
});
export type UnpublishWebsitePageOutput = z.infer<typeof UnpublishWebsitePageOutputSchema>;
