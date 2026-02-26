import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError } from "@corely/kernel";
import { IntegrationConnectionResolverService } from "./integration-connection-resolver.service";
import { IntegrationConnectionEntity } from "../../domain/integration-connection.entity";
import type { IntegrationConnectionRepositoryPort } from "../ports/integration-connection-repository.port";
import { IntegrationSecretsService } from "../../infrastructure/secrets/integration-secrets.service";

class FakeIntegrationConnectionRepository implements IntegrationConnectionRepositoryPort {
  public byId = new Map<string, IntegrationConnectionEntity>();
  public activeByKind = new Map<string, IntegrationConnectionEntity>();

  async create(_connection: IntegrationConnectionEntity): Promise<void> {}
  async update(_connection: IntegrationConnectionEntity): Promise<void> {}

  async findById(tenantId: string, id: string): Promise<IntegrationConnectionEntity | null> {
    const connection = this.byId.get(id);
    if (!connection || connection.toObject().tenantId !== tenantId) {
      return null;
    }
    return connection;
  }

  async list(): Promise<IntegrationConnectionEntity[]> {
    return Array.from(this.byId.values());
  }

  async findActiveByKind(
    tenantId: string,
    workspaceId: string,
    kind: "sumup" | "adyen" | "microsoft_graph_mail" | "google_gmail"
  ): Promise<IntegrationConnectionEntity | null> {
    return this.activeByKind.get(`${tenantId}:${workspaceId}:${kind}`) ?? null;
  }
}

const buildConnection = (input?: {
  id?: string;
  kind?: "sumup" | "adyen" | "microsoft_graph_mail" | "google_gmail";
  secretEncrypted?: string | null;
}) =>
  new IntegrationConnectionEntity({
    id: input?.id ?? "conn-1",
    tenantId: "tenant-1",
    workspaceId: "workspace-1",
    kind: input?.kind ?? "sumup",
    authMethod: "api_key",
    status: "active",
    displayName: "SumUp Main",
    config: {},
    secretEncrypted:
      input && "secretEncrypted" in input ? (input.secretEncrypted ?? null) : "ciphertext",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  });

describe("IntegrationConnectionResolverService", () => {
  let repository: FakeIntegrationConnectionRepository;
  let secrets: IntegrationSecretsService;
  let service: IntegrationConnectionResolverService;

  beforeEach(() => {
    repository = new FakeIntegrationConnectionRepository();
    secrets = {
      decrypt: vi.fn().mockReturnValue("plain-secret"),
    } as unknown as IntegrationSecretsService;
    service = new IntegrationConnectionResolverService(repository, secrets);
  });

  it("resolves active connection and decrypts secret", async () => {
    const connection = buildConnection({ secretEncrypted: "encrypted-value" });
    repository.activeByKind.set("tenant-1:workspace-1:sumup", connection);

    const resolved = await service.resolveActiveByKind("tenant-1", "workspace-1", "sumup");

    expect(resolved.connection.toObject().id).toBe("conn-1");
    expect(resolved.secret).toBe("plain-secret");
    expect(vi.mocked(secrets.decrypt)).toHaveBeenCalledWith("encrypted-value");
  });

  it("throws NotFoundError when no active connection exists", async () => {
    await expect(
      service.resolveActiveByKind("tenant-1", "workspace-1", "sumup")
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws ConflictError when active connection has no stored secret", async () => {
    repository.activeByKind.set(
      "tenant-1:workspace-1:sumup",
      buildConnection({ secretEncrypted: null })
    );

    await expect(
      service.resolveActiveByKind("tenant-1", "workspace-1", "sumup")
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
