import { z } from "zod";
import { ChannelKeySchema } from "./activity.types";

const ChannelTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  body: z.string(),
  subject: z.string().optional(),
});

const ChannelActionSchema = z.object({
  type: z.enum(["deeplink", "profileUrl", "mailto"]),
  urlTemplate: z.string(),
});

const ChannelCapabilitiesSchema = z.object({
  canSendFromCRM: z.boolean().default(false),
  canReceiveInbound: z.boolean().default(false),
  hasDeliveryReceipts: z.boolean().default(false),
  supportsThreads: z.boolean().default(false),
  supportsAttachments: z.boolean().default(false),
  manualOnly: z.boolean().default(true),
  open: z.boolean().default(true), // backward-compatible UI capability
  copy: z.boolean().default(true), // backward-compatible UI capability
  log: z.boolean().default(true), // backward-compatible UI capability
  subject: z.boolean().default(false), // backward-compatible UI capability
  attachments: z.boolean().default(false), // backward-compatible UI capability
});

export const ChannelDefinitionSchema = z.object({
  key: ChannelKeySchema,
  label: z.string(),
  category: z.enum(["EMAIL", "MESSAGING", "SOCIAL", "INTERNAL"]).default("MESSAGING"),
  enabled: z.boolean().default(true),
  order: z.number().int().default(0),
  iconKey: z.string().optional(),
  requiredContactFields: z.array(z.string()).default([]),
  defaultProviderKey: z.string().optional(),
  capabilities: ChannelCapabilitiesSchema,
  action: ChannelActionSchema,
  templates: z.array(ChannelTemplateSchema).default([]),
});

export type ChannelDefinition = z.infer<typeof ChannelDefinitionSchema>;

export const ListChannelsOutputSchema = z.object({
  channels: z.array(ChannelDefinitionSchema),
});

export type ListChannelsOutput = z.infer<typeof ListChannelsOutputSchema>;
