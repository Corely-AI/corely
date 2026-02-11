import {
  type CashRegister,
  type CashEntry,
  type CashDayClose,
  type CreateCashRegister,
  type UpdateCashRegister,
  type CreateCashEntry,
  type ReverseCashEntry,
  type SubmitDailyClose,
} from "@corely/contracts";
import { apiClient } from "./api-client";

type CreateCashRegisterInput = Omit<CreateCashRegister, "tenantId"> & { tenantId?: string };
type CreateCashEntryInput = Omit<CreateCashEntry, "tenantId" | "registerId"> & {
  tenantId?: string;
  registerId?: string;
};
type ReverseCashEntryInput = Omit<ReverseCashEntry, "tenantId" | "originalEntryId"> & {
  tenantId?: string;
  originalEntryId?: string;
};
type SubmitDailyCloseInput = Omit<SubmitDailyClose, "tenantId" | "registerId"> & {
  tenantId?: string;
  registerId?: string;
};

export class CashManagementApi {
  // --- REGISTERS ---

  async listRegisters(): Promise<{ registers: CashRegister[] }> {
    return apiClient.get<{ registers: CashRegister[] }>("/cash-registers", {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getRegister(id: string): Promise<{ register: CashRegister }> {
    return apiClient.get<{ register: CashRegister }>(`/cash-registers/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createRegister(input: CreateCashRegisterInput): Promise<{ register: CashRegister }> {
    return apiClient.post<{ register: CashRegister }>("/cash-registers", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async updateRegister(id: string, input: UpdateCashRegister): Promise<{ register: CashRegister }> {
    return apiClient.patch<{ register: CashRegister }>(`/cash-registers/${id}`, input, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  // --- ENTRIES ---

  async listEntries(
    registerId: string,
    params: { from?: string; to?: string } = {}
  ): Promise<{ entries: CashEntry[] }> {
    const query = new URLSearchParams();
    if (params.from) {
      query.set("from", params.from);
    }
    if (params.to) {
      query.set("to", params.to);
    }

    return apiClient.get<{ entries: CashEntry[] }>(
      `/cash-registers/${registerId}/entries?${query.toString()}`,
      { correlationId: apiClient.generateCorrelationId() }
    );
  }

  async createEntry(
    registerId: string,
    input: CreateCashEntryInput
  ): Promise<{ entry: CashEntry }> {
    // Ensuring registerId in input matches
    const payload = { ...input, registerId };
    return apiClient.post<{ entry: CashEntry }>(`/cash-registers/${registerId}/entries`, payload, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async reverseEntry(entryId: string, input: ReverseCashEntryInput): Promise<{ entry: CashEntry }> {
    const payload = { ...input, originalEntryId: entryId };
    return apiClient.post<{ entry: CashEntry }>(`/cash-entries/${entryId}/reverse`, payload, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  // --- DAILY CLOSE ---

  async listDailyCloses(
    registerId: string,
    params: { from?: string; to?: string } = {}
  ): Promise<{ closes: CashDayClose[] }> {
    const query = new URLSearchParams();
    if (params.from) {
      query.set("from", params.from);
    }
    if (params.to) {
      query.set("to", params.to);
    }

    return apiClient.get<{ closes: CashDayClose[] }>(
      `/cash-registers/${registerId}/daily-close?${query.toString()}`,
      { correlationId: apiClient.generateCorrelationId() }
    );
  }

  async submitDailyClose(
    registerId: string,
    input: SubmitDailyCloseInput
  ): Promise<{ close: CashDayClose }> {
    const payload = { ...input, registerId };
    return apiClient.post<{ close: CashDayClose }>(
      `/cash-registers/${registerId}/daily-close`,
      payload,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }
}

export const cashManagementApi = new CashManagementApi();
