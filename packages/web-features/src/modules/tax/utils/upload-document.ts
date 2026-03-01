import { apiClient } from "@corely/web-shared/lib/api-client";
import type {
  CreateUploadIntentInput,
  CreateUploadIntentOutput,
  CompleteUploadOutput,
} from "@corely/contracts";

export async function uploadTaxDocument(file: File): Promise<string> {
  const contentType = file.type || "application/octet-stream";
  const intent = await apiClient.post<CreateUploadIntentOutput>(
    "/documents/upload-intent",
    {
      filename: file.name,
      contentType,
      sizeBytes: file.size,
      isPublic: false,
      documentType: "UPLOAD",
    } satisfies CreateUploadIntentInput,
    {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    }
  );

  const headers = new Headers(intent.upload.requiredHeaders ?? {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", contentType);
  }

  const uploadResponse = await fetch(intent.upload.url, {
    method: intent.upload.method,
    headers,
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error("Failed to upload file");
  }

  const completed = await apiClient.post<CompleteUploadOutput>(
    `/documents/${intent.document.id}/files/${intent.file.id}/complete`,
    { sizeBytes: file.size },
    {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    }
  );

  return completed.document.id;
}
