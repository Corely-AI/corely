import { apiClient } from "@corely/web-shared/lib/api-client";
import type { UploadFileBase64Input, UploadFileOutput } from "@corely/contracts";

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export async function uploadBelegDocument(file: File): Promise<string> {
  const contentType = file.type || "application/octet-stream";
  const base64 = await fileToBase64(file);
  const uploaded = await apiClient.post<UploadFileOutput>(
    "/documents/upload-base64",
    {
      filename: file.name,
      contentType,
      base64,
      isPublic: false,
      purpose: "cash-beleg",
    } satisfies UploadFileBase64Input,
    {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    }
  );

  return uploaded.document.id;
}
