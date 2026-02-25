import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { Prisma } from "@prisma/client";
import type {
  IntegrationAuthMethod,
  IntegrationConnectionStatus,
  IntegrationKind,
} from "@corely/contracts";
import { IntegrationConnectionEntity } from "../../domain/integration-connection.entity";
import type { IntegrationConnectionRepositoryPort } from "../../application/ports/integration-connection-repository.port";

@Injectable()
export class PrismaIntegrationConnectionRepositoryAdapter implements IntegrationConnectionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(connection: IntegrationConnectionEntity): Promise<void> {
    const row = connection.toObject();
    await this.prisma.integrationConnection.create({
      data: {
        id: row.id,
        tenantId: row.tenantId,
        workspaceId: row.workspaceId,
        kind: this.toPrismaKind(row.kind),
        authMethod: this.toPrismaAuthMethod(row.authMethod),
        status: this.toPrismaStatus(row.status),
        displayName: row.displayName,
        configJson: this.toNullableJsonInput(row.config),
        secretEncrypted: row.secretEncrypted,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    });
  }

  async update(connection: IntegrationConnectionEntity): Promise<void> {
    const row = connection.toObject();
    await this.prisma.integrationConnection.update({
      where: {
        id: row.id,
      },
      data: {
        status: this.toPrismaStatus(row.status),
        displayName: row.displayName,
        configJson: this.toNullableJsonInput(row.config),
        secretEncrypted: row.secretEncrypted,
        updatedAt: row.updatedAt,
      },
    });
  }

  async findById(tenantId: string, id: string): Promise<IntegrationConnectionEntity | null> {
    const row = await this.prisma.integrationConnection.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    return row ? this.toDomain(row) : null;
  }

  async list(
    tenantId: string,
    filter: {
      workspaceId?: string;
      kind?: IntegrationKind;
    }
  ): Promise<IntegrationConnectionEntity[]> {
    const rows = await this.prisma.integrationConnection.findMany({
      where: {
        tenantId,
        workspaceId: filter.workspaceId,
        kind: filter.kind ? this.toPrismaKind(filter.kind) : undefined,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return rows.map((row) => this.toDomain(row));
  }

  async findActiveByKind(
    tenantId: string,
    workspaceId: string,
    kind: IntegrationKind
  ): Promise<IntegrationConnectionEntity | null> {
    const row = await this.prisma.integrationConnection.findFirst({
      where: {
        tenantId,
        workspaceId,
        kind: this.toPrismaKind(kind),
        status: "ACTIVE",
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return row ? this.toDomain(row) : null;
  }

  private toDomain(row: {
    id: string;
    tenantId: string;
    workspaceId: string;
    kind: string;
    authMethod: string;
    status: string;
    displayName: string | null;
    configJson: unknown;
    secretEncrypted: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): IntegrationConnectionEntity {
    return new IntegrationConnectionEntity({
      id: row.id,
      tenantId: row.tenantId,
      workspaceId: row.workspaceId,
      kind: this.fromPrismaKind(row.kind),
      authMethod: this.fromPrismaAuthMethod(row.authMethod),
      status: this.fromPrismaStatus(row.status),
      displayName: row.displayName,
      config: this.toConfig(row.configJson),
      secretEncrypted: row.secretEncrypted,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toConfig(value: unknown): Record<string, unknown> {
    return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  }

  private toNullableJsonInput(value: unknown): Prisma.JsonNullValueInput | Prisma.InputJsonValue {
    if (value === null || value === undefined) {
      return Prisma.JsonNull;
    }

    return value as Prisma.InputJsonValue;
  }

  private toPrismaKind(
    kind: IntegrationKind
  ): "SUMUP" | "ADYEN" | "MICROSOFT_GRAPH_MAIL" | "GOOGLE_GMAIL" {
    switch (kind) {
      case "sumup":
        return "SUMUP";
      case "adyen":
        return "ADYEN";
      case "microsoft_graph_mail":
        return "MICROSOFT_GRAPH_MAIL";
      case "google_gmail":
        return "GOOGLE_GMAIL";
    }
  }

  private fromPrismaKind(value: string): IntegrationKind {
    switch (value) {
      case "SUMUP":
        return "sumup";
      case "ADYEN":
        return "adyen";
      case "MICROSOFT_GRAPH_MAIL":
        return "microsoft_graph_mail";
      default:
        return "google_gmail";
    }
  }

  private toPrismaAuthMethod(method: IntegrationAuthMethod): "API_KEY" | "OAUTH2" {
    return method === "api_key" ? "API_KEY" : "OAUTH2";
  }

  private fromPrismaAuthMethod(value: string): IntegrationAuthMethod {
    return value === "API_KEY" ? "api_key" : "oauth2";
  }

  private toPrismaStatus(status: IntegrationConnectionStatus): "ACTIVE" | "INVALID" | "DISABLED" {
    if (status === "invalid") {
      return "INVALID";
    }
    if (status === "disabled") {
      return "DISABLED";
    }
    return "ACTIVE";
  }

  private fromPrismaStatus(value: string): IntegrationConnectionStatus {
    if (value === "INVALID") {
      return "invalid";
    }
    if (value === "DISABLED") {
      return "disabled";
    }
    return "active";
  }
}
