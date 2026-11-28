import type { ProcedureDetail, ProcedureFields, PublishedProcedure } from "@corely/contracts";

export type ProcedureRecord = Omit<ProcedureDetail, "canManage">;

export function publishProcedure(
  draft: ProcedureFields,
  previous: PublishedProcedure | null,
  time: Date
): PublishedProcedure {
  return { ...draft, version: (previous?.version ?? 0) + 1, publishedAt: time.toISOString() };
}
