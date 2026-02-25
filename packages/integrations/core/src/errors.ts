import { ExternalServiceError } from "@corely/domain";

export interface HttpFailureMetadata {
  provider: string;
  status?: number;
  path?: string;
  retryable?: boolean;
  body?: string;
}

export const buildExternalServiceError = (
  message: string,
  metadata: HttpFailureMetadata,
  cause?: Error
): ExternalServiceError => {
  const payload = {
    code: `ExternalService:${metadata.provider}`,
    retryable: metadata.retryable ?? (metadata.status ? metadata.status >= 500 : true),
    data: {
      status: metadata.status,
      path: metadata.path,
      body: metadata.body,
    },
    ...(cause ? { cause } : {}),
  };

  return new ExternalServiceError(message, payload);
};
