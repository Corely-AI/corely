import type {
  CreateRegisterInput,
  CreateRegisterOutput,
  ListRegistersInput,
  ListRegistersOutput,
} from "@corely/contracts";
import { apiClient } from "./api-client";

const toQuery = (params?: Record<string, string | undefined>) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (!value) {
      continue;
    }
    query.set(key, value);
  }

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
};

export class PosRegistersApi {
  async listRegisters(input: ListRegistersInput = {}): Promise<ListRegistersOutput> {
    return apiClient.get(
      `/pos/registers${toQuery({
        workspaceId: input.workspaceId,
        status: input.status,
      })}`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async createRegister(input: CreateRegisterInput): Promise<CreateRegisterOutput> {
    return apiClient.post("/pos/registers", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }
}

export const posRegistersApi = new PosRegistersApi();
