import type {
  IdempotencyStoragePort,
  StoredResponse,
} from "@/shared/ports/idempotency-storage.port";

export const getIdempotentBody = async <T>(params: {
  idempotency: IdempotencyStoragePort;
  tenantId: string;
  actionKey: string;
  idempotencyKey?: string;
}): Promise<T | null> => {
  if (!params.idempotencyKey) {
    return null;
  }

  const cached = await params.idempotency.get(
    params.actionKey,
    params.tenantId,
    params.idempotencyKey
  );
  return (cached?.body as T | undefined) ?? null;
};

export const storeIdempotentBody = async <T>(params: {
  idempotency: IdempotencyStoragePort;
  tenantId: string;
  actionKey: string;
  idempotencyKey?: string;
  body: T;
}): Promise<void> => {
  if (!params.idempotencyKey) {
    return;
  }

  const response: StoredResponse = {
    body: params.body,
  };

  await params.idempotency.store(
    params.actionKey,
    params.tenantId,
    params.idempotencyKey,
    response
  );
};
