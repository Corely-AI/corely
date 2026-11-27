export const MAX_INBOUND_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const signatures = {
  "application/pdf": { bytes: Buffer.from("%PDF-"), extension: "pdf" },
  "image/jpeg": { bytes: Buffer.from([0xff, 0xd8, 0xff]), extension: "jpg" },
  "image/png": { bytes: Buffer.from("89504e470d0a1a0a", "hex"), extension: "png" },
};

export type InboundAttachment = {
  id: string;
  filename?: string | null;
  content_type: string;
  content_disposition?: string | null;
  content_id?: string | null;
};

type ContentType = keyof typeof signatures;

export const describeReceiptAttachment = (attachment: InboundAttachment, fallback: string) => {
  const contentType = attachment.content_type.split(";")[0].trim().toLowerCase();
  const disposition = attachment.content_disposition?.trim().toLowerCase();
  if (
    !Object.hasOwn(signatures, contentType) ||
    disposition === "inline" ||
    (disposition !== "attachment" && attachment.content_id)
  ) {
    return null;
  }
  const supportedType = contentType as ContentType;
  const filename =
    attachment.filename
      ?.replace(/\p{Cc}/gu, "")
      .trim()
      .slice(0, 255) || `${fallback}.${signatures[supportedType].extension}`;
  return { filename, contentType: supportedType };
};

export const matchesReceiptAttachment = (contentType: ContentType, bytes: Buffer) =>
  bytes.length <= MAX_INBOUND_ATTACHMENT_BYTES &&
  bytes.subarray(0, signatures[contentType].bytes.length).equals(signatures[contentType].bytes);
