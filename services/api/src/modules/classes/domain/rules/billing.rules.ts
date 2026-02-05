import type { BillingPreviewItem, BillingPreviewLine } from "../entities/classes.entities";

export type AttendanceBillingRow = {
  clientId: string;
  classGroupId: string;
  classGroupName: string;
  priceCents: number;
  currency: string;
};

export const aggregateBillingPreview = (rows: AttendanceBillingRow[]): BillingPreviewItem[] => {
  const byClient = new Map<string, BillingPreviewItem>();

  for (const row of rows) {
    const existingClient =
      byClient.get(row.clientId) ??
      ({
        clientId: row.clientId,
        totalSessions: 0,
        totalAmountCents: 0,
        currency: row.currency,
        lines: [],
      } satisfies BillingPreviewItem);

    let line = existingClient.lines.find((item) => item.classGroupId === row.classGroupId);
    if (!line) {
      line = {
        classGroupId: row.classGroupId,
        classGroupName: row.classGroupName,
        sessions: 0,
        priceCents: row.priceCents,
        amountCents: 0,
        currency: row.currency,
      } satisfies BillingPreviewLine;
      existingClient.lines.push(line);
    }

    line.sessions += 1;
    line.amountCents = line.sessions * line.priceCents;

    existingClient.totalSessions += 1;
    existingClient.totalAmountCents = existingClient.lines.reduce(
      (sum, item) => sum + item.amountCents,
      0
    );

    byClient.set(row.clientId, existingClient);
  }

  return Array.from(byClient.values());
};
