import type { ChannelTemplateDto } from "@corely/contracts";
import type { ChannelTemplateRecord } from "../ports/channel-template-repository.port";

export const toChannelTemplateDto = (record: ChannelTemplateRecord): ChannelTemplateDto => ({
  id: record.id,
  tenantId: record.tenantId,
  workspaceId: record.workspaceId,
  channel: record.channel,
  name: record.name,
  subject: record.subject,
  body: record.body,
  createdByUserId: record.createdByUserId,
  updatedByUserId: record.updatedByUserId,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});
