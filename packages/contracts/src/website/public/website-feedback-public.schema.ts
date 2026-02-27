import { z } from "zod";
import { PublicSiteRefSchema } from "./public-site-ref.schema";

const isYoutubeHost = (host: string): boolean => {
  const normalized = host.toLowerCase();
  return (
    normalized === "youtube.com" ||
    normalized === "www.youtube.com" ||
    normalized === "m.youtube.com" ||
    normalized === "youtu.be"
  );
};

const normalizeYoutubeUrl = (rawValue: string): string => {
  const url = new URL(rawValue.trim());
  url.hostname = url.hostname.toLowerCase();
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.toString();
};

const WebsiteFeedbackYoutubeUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    try {
      return isYoutubeHost(new URL(value).hostname);
    } catch {
      return false;
    }
  }, "Only youtube.com and youtu.be URLs are allowed")
  .transform(normalizeYoutubeUrl);

export const CreateWebsiteFeedbackInputSchema = z.object({
  siteRef: PublicSiteRefSchema,
  message: z.string().trim().min(1).max(4000),
  email: z.string().trim().email().optional(),
  name: z.string().trim().min(1).max(200).optional(),
  rating: z
    .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
    .optional(),
  imageFileIds: z.array(z.string().trim().min(1)).max(10).optional(),
  youtubeUrls: z.array(WebsiteFeedbackYoutubeUrlSchema).max(5).optional(),
  meta: z
    .object({
      userAgent: z.string().trim().min(1).max(512).optional(),
      referrer: z.string().trim().url().optional(),
      consent: z.boolean().optional(),
    })
    .optional(),
  captchaToken: z.string().trim().min(1).optional(),
});
export type CreateWebsiteFeedbackInput = z.infer<typeof CreateWebsiteFeedbackInputSchema>;

export const CreateWebsiteFeedbackOutputSchema = z.object({
  feedbackId: z.string(),
});
export type CreateWebsiteFeedbackOutput = z.infer<typeof CreateWebsiteFeedbackOutputSchema>;
