import { z } from "zod";
import { CopilotUIPartSchema } from "./chat.schema";

export const CopilotThreadSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastMessageAt: z.string(),
});

export type CopilotThreadSummary = z.infer<typeof CopilotThreadSummarySchema>;

export const CopilotThreadDetailSchema = CopilotThreadSummarySchema.extend({
  archivedAt: z.string().nullable().optional(),
});

export type CopilotThreadDetail = z.infer<typeof CopilotThreadDetailSchema>;

export const CopilotThreadMessageSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  role: z.enum(["user", "assistant", "system", "tool"]),
  parts: z.array(CopilotUIPartSchema).optional(),
  content: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});

export type CopilotThreadMessage = z.infer<typeof CopilotThreadMessageSchema>;

export const ListCopilotThreadsRequestSchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  q: z.string().trim().optional(),
});

export type ListCopilotThreadsRequest = z.infer<typeof ListCopilotThreadsRequestSchema>;

export const ListCopilotThreadsResponseSchema = z.object({
  items: z.array(CopilotThreadSummarySchema),
  nextCursor: z.string().nullable(),
});

export type ListCopilotThreadsResponse = z.infer<typeof ListCopilotThreadsResponseSchema>;

export const GetCopilotThreadResponseSchema = z.object({
  thread: CopilotThreadDetailSchema,
});

export type GetCopilotThreadResponse = z.infer<typeof GetCopilotThreadResponseSchema>;

export const ListCopilotThreadMessagesRequestSchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});

export type ListCopilotThreadMessagesRequest = z.infer<
  typeof ListCopilotThreadMessagesRequestSchema
>;

export const ListCopilotThreadMessagesResponseSchema = z.object({
  items: z.array(CopilotThreadMessageSchema),
  nextCursor: z.string().nullable(),
});

export type ListCopilotThreadMessagesResponse = z.infer<
  typeof ListCopilotThreadMessagesResponseSchema
>;

export const CreateCopilotThreadRequestSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
});

export type CreateCopilotThreadRequest = z.infer<typeof CreateCopilotThreadRequestSchema>;

export const CreateCopilotThreadResponseSchema = z.object({
  thread: CopilotThreadDetailSchema,
});

export type CreateCopilotThreadResponse = z.infer<typeof CreateCopilotThreadResponseSchema>;

export const SearchCopilotThreadsRequestSchema = z.object({
  q: z.string().trim().min(1),
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export type SearchCopilotThreadsRequest = z.infer<typeof SearchCopilotThreadsRequestSchema>;

export const CopilotThreadSearchResultSchema = z.object({
  threadId: z.string(),
  messageId: z.string(),
  threadTitle: z.string(),
  snippet: z.string(),
  createdAt: z.string(),
});

export type CopilotThreadSearchResult = z.infer<typeof CopilotThreadSearchResultSchema>;

export const SearchCopilotThreadsResponseSchema = z.object({
  items: z.array(CopilotThreadSearchResultSchema),
  nextCursor: z.string().nullable(),
});

export type SearchCopilotThreadsResponse = z.infer<typeof SearchCopilotThreadsResponseSchema>;
