import type {
  GetPosTransactionOutput,
  ListPosTransactionsInput,
  ListPosTransactionsOutput,
} from "@corely/contracts";
import { buildListQuery } from "./api-query-utils";
import { apiClient } from "./api-client";

export class PosTransactionsApi {
  async listTransactions(input: ListPosTransactionsInput = {}): Promise<ListPosTransactionsOutput> {
    const query = buildListQuery(input);
    const queryString = query.toString();

    return apiClient.get(`/pos/admin/transactions${queryString ? `?${queryString}` : ""}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getTransaction(transactionId: string): Promise<GetPosTransactionOutput> {
    return apiClient.get(`/pos/admin/transactions/${transactionId}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }
}

export const posTransactionsApi = new PosTransactionsApi();
