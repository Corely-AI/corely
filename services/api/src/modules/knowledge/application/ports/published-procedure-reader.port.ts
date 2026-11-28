import type { PublishedProcedureSummary } from "@corely/contracts";
import type { TransactionContext, UseCaseContext } from "@corely/kernel";

export const PUBLISHED_PROCEDURES = Symbol("knowledge/published-procedures");

export interface PublishedProcedureReader {
  canRead(id: string, ctx: UseCaseContext, tx?: TransactionContext): Promise<boolean>;
  previewPublished(id: string, ctx: UseCaseContext): Promise<PublishedProcedureSummary>;
}
