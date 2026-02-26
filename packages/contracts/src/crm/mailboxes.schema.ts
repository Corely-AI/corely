import { z } from "zod";
import { IntegrationKindSchema } from "../integrations";

const EmailAddressSchema = z.object({
  name: z.string().nullable().optional(),
  email: z.string().email(),
});

export const CrmMailboxDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  integrationConnectionId: z.string(),
  providerKind: IntegrationKindSchema,
  address: z.string().email(),
  displayName: z.string().nullable().optional(),
  syncCursor: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CrmMailboxDto = z.infer<typeof CrmMailboxDtoSchema>;

export const CrmMailThreadDtoSchema = z.object({
  id: z.string(),
  mailboxId: z.string(),
  externalThreadId: z.string(),
  subject: z.string().nullable().optional(),
  snippet: z.string().nullable().optional(),
  lastMessageAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CrmMailThreadDto = z.infer<typeof CrmMailThreadDtoSchema>;

export const CrmMailMessageDtoSchema = z.object({
  id: z.string(),
  mailboxId: z.string(),
  threadId: z.string(),
  externalMessageId: z.string(),
  direction: z.enum(["INBOUND", "OUTBOUND"]),
  subject: z.string().nullable().optional(),
  from: EmailAddressSchema.nullable().optional(),
  to: z.array(EmailAddressSchema),
  cc: z.array(EmailAddressSchema),
  bcc: z.array(EmailAddressSchema),
  snippet: z.string().nullable().optional(),
  bodyPreview: z.string().nullable().optional(),
  sentAt: z.string().nullable().optional(),
  receivedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CrmMailMessageDto = z.infer<typeof CrmMailMessageDtoSchema>;

export const CreateCrmMailboxInputSchema = z.object({
  workspaceId: z.string(),
  integrationConnectionId: z.string(),
  address: z.string().email(),
  displayName: z.string().optional(),
});
export type CreateCrmMailboxInput = z.infer<typeof CreateCrmMailboxInputSchema>;

export const CreateCrmMailboxOutputSchema = z.object({
  mailbox: CrmMailboxDtoSchema,
});
export type CreateCrmMailboxOutput = z.infer<typeof CreateCrmMailboxOutputSchema>;

export const SendCrmMailboxMessageInputSchema = z.object({
  mailboxId: z.string(),
  to: z.array(z.string().email()).min(1),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  subject: z.string().min(1),
  html: z.string().optional(),
  text: z.string().optional(),
});
export type SendCrmMailboxMessageInput = z.infer<typeof SendCrmMailboxMessageInputSchema>;

export const SendCrmMailboxMessageOutputSchema = z.object({
  message: CrmMailMessageDtoSchema,
});
export type SendCrmMailboxMessageOutput = z.infer<typeof SendCrmMailboxMessageOutputSchema>;

export const SyncCrmMailboxInputSchema = z.object({
  mailboxId: z.string(),
  limit: z.number().int().positive().max(200).optional(),
  since: z.string().datetime().optional(),
});
export type SyncCrmMailboxInput = z.infer<typeof SyncCrmMailboxInputSchema>;

export const SyncCrmMailboxOutputSchema = z.object({
  mailbox: CrmMailboxDtoSchema,
  threads: z.array(CrmMailThreadDtoSchema),
  messages: z.array(CrmMailMessageDtoSchema),
});
export type SyncCrmMailboxOutput = z.infer<typeof SyncCrmMailboxOutputSchema>;
