import type { ListPosTransactionsInput } from "@corely/contracts";
import type { PosSaleRecord } from "../../domain/pos-sale-record.entity";

export const POS_SALE_REPOSITORY_PORT = "pos/pos-sale-repository";

export interface ListPosSaleRecordsResult {
  items: PosSaleRecord[];
  total: number;
}

export interface PosSaleRepositoryPort {
  upsert(record: PosSaleRecord): Promise<void>;
  list(workspaceId: string, input: ListPosTransactionsInput): Promise<ListPosSaleRecordsResult>;
  findById(workspaceId: string, transactionId: string): Promise<PosSaleRecord | null>;
}
