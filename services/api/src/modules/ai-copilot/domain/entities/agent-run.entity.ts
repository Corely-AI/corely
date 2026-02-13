export class AgentRun {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly createdByUserId: string | null,
    public status: string,
    public readonly startedAt: Date,
    public finishedAt?: Date,
    public metadataJson?: string,
    public readonly traceId?: string,
    public readonly title?: string | null,
    public readonly lastMessageAt?: Date,
    public readonly archivedAt?: Date,
    public readonly updatedAt?: Date
  ) {}
}
