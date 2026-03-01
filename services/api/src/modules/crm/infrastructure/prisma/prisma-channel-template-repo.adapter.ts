import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { ChannelTemplate } from "@prisma/client";
import type {
  ChannelTemplateRecord,
  ChannelTemplateRepositoryPort,
} from "../../application/ports/channel-template-repository.port";

const toRecord = (row: ChannelTemplate | null): ChannelTemplateRecord | null => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    channel: row.channelKey,
    name: row.name,
    subject: row.subject,
    body: row.body,
    createdByUserId: row.createdByUserId,
    updatedByUserId: row.updatedByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

@Injectable()
export class PrismaChannelTemplateRepoAdapter implements ChannelTemplateRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listByWorkspace(
    tenantId: string,
    workspaceId: string,
    params?: {
      channel?: string;
      q?: string;
    }
  ): Promise<ChannelTemplateRecord[]> {
    const q = params?.q?.trim();
    const rows = await this.prisma.channelTemplate.findMany({
      where: {
        tenantId,
        workspaceId,
        ...(params?.channel ? { channelKey: params.channel } : {}),
        ...(q
          ? {
              name: {
                contains: q,
                mode: "insensitive",
              },
            }
          : {}),
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    return rows.map(
      (row) =>
        ({
          id: row.id,
          tenantId: row.tenantId,
          workspaceId: row.workspaceId,
          channel: row.channelKey,
          name: row.name,
          subject: row.subject,
          body: row.body,
          createdByUserId: row.createdByUserId,
          updatedByUserId: row.updatedByUserId,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }) satisfies ChannelTemplateRecord
    );
  }

  async findById(
    tenantId: string,
    workspaceId: string,
    templateId: string
  ): Promise<ChannelTemplateRecord | null> {
    const row = await this.prisma.channelTemplate.findFirst({
      where: {
        id: templateId,
        tenantId,
        workspaceId,
      },
    });

    return toRecord(row);
  }

  async findByName(
    tenantId: string,
    workspaceId: string,
    channel: string,
    name: string,
    excludeTemplateId?: string
  ): Promise<ChannelTemplateRecord | null> {
    const row = await this.prisma.channelTemplate.findFirst({
      where: {
        tenantId,
        workspaceId,
        channelKey: channel,
        name: {
          equals: name,
          mode: "insensitive",
        },
        ...(excludeTemplateId ? { id: { not: excludeTemplateId } } : {}),
      },
    });

    return toRecord(row);
  }

  async create(input: {
    tenantId: string;
    workspaceId: string;
    channel: string;
    name: string;
    subject: string | null;
    body: string;
    createdByUserId?: string | null;
    updatedByUserId?: string | null;
  }): Promise<ChannelTemplateRecord> {
    const row = await this.prisma.channelTemplate.create({
      data: {
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        channelKey: input.channel,
        name: input.name,
        subject: input.subject,
        body: input.body,
        createdByUserId: input.createdByUserId ?? null,
        updatedByUserId: input.updatedByUserId ?? null,
      },
    });

    return {
      id: row.id,
      tenantId: row.tenantId,
      workspaceId: row.workspaceId,
      channel: row.channelKey,
      name: row.name,
      subject: row.subject,
      body: row.body,
      createdByUserId: row.createdByUserId,
      updatedByUserId: row.updatedByUserId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async update(input: {
    tenantId: string;
    workspaceId: string;
    templateId: string;
    channel: string;
    name: string;
    subject: string | null;
    body: string;
    updatedByUserId?: string | null;
  }): Promise<ChannelTemplateRecord> {
    await this.prisma.channelTemplate.updateMany({
      where: {
        id: input.templateId,
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
      },
      data: {
        channelKey: input.channel,
        name: input.name,
        subject: input.subject,
        body: input.body,
        updatedByUserId: input.updatedByUserId ?? null,
      },
    });

    const updated = await this.findById(input.tenantId, input.workspaceId, input.templateId);
    if (!updated) {
      throw new Error("Template update failed");
    }
    return updated;
  }

  async delete(tenantId: string, workspaceId: string, templateId: string): Promise<void> {
    await this.prisma.channelTemplate.deleteMany({
      where: {
        id: templateId,
        tenantId,
        workspaceId,
      },
    });
  }
}
