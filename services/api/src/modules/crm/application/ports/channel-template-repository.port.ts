export type ChannelTemplateRecord = {
  id: string;
  tenantId: string;
  workspaceId: string;
  channel: string;
  name: string;
  subject: string | null;
  body: string;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export interface ChannelTemplateRepositoryPort {
  listByWorkspace(
    tenantId: string,
    workspaceId: string,
    params?: {
      channel?: string;
      q?: string;
    }
  ): Promise<ChannelTemplateRecord[]>;

  findById(
    tenantId: string,
    workspaceId: string,
    templateId: string
  ): Promise<ChannelTemplateRecord | null>;

  findByName(
    tenantId: string,
    workspaceId: string,
    channel: string,
    name: string,
    excludeTemplateId?: string
  ): Promise<ChannelTemplateRecord | null>;

  create(input: {
    tenantId: string;
    workspaceId: string;
    channel: string;
    name: string;
    subject: string | null;
    body: string;
    createdByUserId?: string | null;
    updatedByUserId?: string | null;
  }): Promise<ChannelTemplateRecord>;

  update(input: {
    tenantId: string;
    workspaceId: string;
    templateId: string;
    channel: string;
    name: string;
    subject: string | null;
    body: string;
    updatedByUserId?: string | null;
  }): Promise<ChannelTemplateRecord>;

  delete(tenantId: string, workspaceId: string, templateId: string): Promise<void>;
}

export const CHANNEL_TEMPLATE_REPOSITORY_PORT = "crm/channel-template-repository";
