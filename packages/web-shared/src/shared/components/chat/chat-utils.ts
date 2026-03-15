export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_ATTACHMENT_MIME_TYPES = new Set(["application/pdf"]);

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  return `${(kb / 1024).toFixed(1)} MB`;
};

export const isSupportedAttachment = (file: File): boolean => {
  if (file.type.startsWith("image/")) {
    return true;
  }
  if (ACCEPTED_ATTACHMENT_MIME_TYPES.has(file.type)) {
    return true;
  }
  return file.name.toLowerCase().endsWith(".pdf");
};

export type ChatFilePart = {
  type: "file";
  mediaType: string;
  filename: string;
  url: string;
};

export const fileToChatPart = async (file: File): Promise<ChatFilePart> => {
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
        return;
      }
      reject(new Error("Failed to encode attachment"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to encode attachment"));
    reader.readAsDataURL(file);
  });

  return {
    type: "file",
    mediaType: file.type || "application/octet-stream",
    filename: file.name,
    url,
  };
};
