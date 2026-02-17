import { randomBytes, timingSafeEqual } from "crypto";

export const INVOICE_SHARE_LINK_MODULE_ID = "invoices";
export const INVOICE_SHARE_LINK_SCOPE = "public-share-links";

export type InvoiceShareLinkRecord = {
  token: string;
  issuedAt: string;
};

export const invoiceShareLinkKey = (invoiceId: string) => `invoice:${invoiceId}`;

export const createInvoiceShareToken = () => randomBytes(24).toString("base64url");

export const parseInvoiceShareLinkRecord = (value: unknown): InvoiceShareLinkRecord | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.token !== "string" || typeof record.issuedAt !== "string") {
    return null;
  }
  return {
    token: record.token,
    issuedAt: record.issuedAt,
  };
};

export const invoiceShareTokenMatches = (expected: string, actual: string): boolean => {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, actualBuffer);
};
