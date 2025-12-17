export interface StoredResponse {
  statusCode?: number;
  body: any;
}

export interface IdempotencyPort {
  get(actionKey: string, tenantId: string | null, key: string): Promise<StoredResponse | null>;
  store(
    actionKey: string,
    tenantId: string | null,
    key: string,
    response: StoredResponse
  ): Promise<void>;
}

export const IDEMPOTENCY_PORT_TOKEN = Symbol("IDEMPOTENCY_PORT_TOKEN");
