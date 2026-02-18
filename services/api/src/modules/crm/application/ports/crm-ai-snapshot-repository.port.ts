export type DealAiSnapshotKind = "insights" | "recommendations";

export type DealAiSnapshotRecord = {
  tenantId: string;
  workspaceId: string;
  dealId: string;
  kind: DealAiSnapshotKind;
  generatedAt: Date;
  payloadJson: Record<string, unknown>;
  version: string;
  ttlExpiresAt: Date;
};

export interface CrmAiSnapshotRepositoryPort {
  findLatestActive(
    tenantId: string,
    workspaceId: string,
    dealId: string,
    kind: DealAiSnapshotKind
  ): Promise<DealAiSnapshotRecord | null>;
  save(record: DealAiSnapshotRecord): Promise<void>;
}

export const CRM_AI_SNAPSHOT_REPOSITORY_PORT = "crm/ai-snapshot-repository";
