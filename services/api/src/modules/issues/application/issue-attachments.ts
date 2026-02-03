import { ValidationFailedError } from "@corely/domain";
import type { AttachmentMetadata } from "@corely/contracts";

const AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
]);

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export const assertAttachmentsValid = (attachments: AttachmentMetadata[], maxBytes: number) => {
  const errors: Array<{ message: string; members: string[] }> = [];

  attachments.forEach((attachment, index) => {
    const path = `attachments[${index}]`;
    if (attachment.sizeBytes > maxBytes) {
      errors.push({
        message: `Attachment exceeds max size of ${maxBytes} bytes`,
        members: [path, "sizeBytes"],
      });
    }

    if (attachment.kind === "AUDIO" && !AUDIO_MIME_TYPES.has(attachment.mimeType)) {
      errors.push({
        message: `Unsupported audio format: ${attachment.mimeType}`,
        members: [path, "mimeType"],
      });
    }

    if (attachment.kind === "IMAGE" && !IMAGE_MIME_TYPES.has(attachment.mimeType)) {
      errors.push({
        message: `Unsupported image format: ${attachment.mimeType}`,
        members: [path, "mimeType"],
      });
    }
  });

  if (errors.length) {
    throw new ValidationFailedError("Attachment validation failed", errors);
  }
};

export const isAudioAttachment = (attachment: AttachmentMetadata) => attachment.kind === "AUDIO";
