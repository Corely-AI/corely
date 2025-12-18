export class Expense {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly merchant: string,
    public readonly totalCents: number,
    public readonly currency: string,
    public readonly category: string | null,
    public readonly issuedAt: Date,
    public readonly createdByUserId: string,
    public readonly createdAt: Date,
    public readonly custom: Record<string, unknown> | null = null
  ) {}
}
