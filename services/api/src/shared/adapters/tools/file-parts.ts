import { type ModelMessage } from "ai";

export type FilePartLike = {
  type: "file";
  data: unknown;
  mediaType: string;
  filename?: string;
};

export const isFilePartLike = (value: unknown): value is FilePartLike => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const typed = value as Record<string, unknown>;
  return (
    typed.type === "file" &&
    "data" in typed &&
    typeof typed.mediaType === "string" &&
    typed.mediaType.length > 0
  );
};

export const parseDataUrl = (
  value: string
): {
  base64: string;
  contentType: string;
} | null => {
  const match = value.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) {
    return null;
  }
  const contentType = match[1] || "application/octet-stream";
  const base64 = match[2] || "";
  if (!base64) {
    return null;
  }
  return { base64: base64.replace(/\s+/g, ""), contentType };
};

export const toBase64Payload = (
  data: unknown,
  mediaType: string
): {
  base64: string;
  contentType: string;
} | null => {
  if (typeof data === "string") {
    const parsedDataUrl = parseDataUrl(data);
    if (parsedDataUrl) {
      return parsedDataUrl;
    }
    if (data.startsWith("http://") || data.startsWith("https://")) {
      return null;
    }
    return { base64: data.replace(/\s+/g, ""), contentType: mediaType };
  }
  if (data instanceof URL) {
    return null;
  }
  if (Buffer.isBuffer(data)) {
    return { base64: data.toString("base64"), contentType: mediaType };
  }
  if (data instanceof Uint8Array) {
    return { base64: Buffer.from(data).toString("base64"), contentType: mediaType };
  }
  if (data instanceof ArrayBuffer) {
    return { base64: Buffer.from(new Uint8Array(data)).toString("base64"), contentType: mediaType };
  }
  return null;
};

export const extensionFromMediaType = (mediaType: string): string => {
  switch (mediaType) {
    case "application/pdf":
      return "pdf";
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
};

export const sanitizeFilename = (value: string): string => value.replace(/[^a-zA-Z0-9._-]/g, "_");

export const normalizeAttachment = (
  filePart: FilePartLike,
  index: number
): {
  filename: string;
  contentType: string;
  base64: string;
} | null => {
  const payload = toBase64Payload(filePart.data, filePart.mediaType);
  if (!payload) {
    return null;
  }
  const fallbackName = `receipt-${index + 1}.${extensionFromMediaType(payload.contentType)}`;
  return {
    filename: sanitizeFilename(filePart.filename ?? fallbackName),
    contentType: payload.contentType,
    base64: payload.base64,
  };
};

export const extractLatestUserAttachments = (messages?: ModelMessage[]): FilePartLike[] => {
  if (!messages?.length) {
    return [];
  }
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "user") {
      continue;
    }
    if (!Array.isArray(message.content)) {
      return [];
    }
    const attachments = (message.content as unknown[]).filter(isFilePartLike);
    return attachments;
  }
  return [];
};
