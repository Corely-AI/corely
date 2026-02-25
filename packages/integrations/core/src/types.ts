export type IntegrationProvider = "sumup" | "adyen" | "microsoft_graph_mail" | "google_gmail";

export type CashlessSessionStatus =
  | "pending"
  | "authorized"
  | "paid"
  | "failed"
  | "cancelled"
  | "expired";

export type CashlessAction =
  | { type: "redirect_url"; url: string }
  | { type: "qr_payload"; payload: string }
  | { type: "terminal_action"; instruction: string }
  | { type: "none" };

export interface CashlessSession {
  providerRef: string;
  status: CashlessSessionStatus;
  action: CashlessAction;
  raw?: unknown;
}

export interface CashlessCreateSessionInput {
  amountCents: number;
  currency: string;
  reference: string;
  description?: string;
  returnUrl?: string;
}

export interface NormalizedEmailAddress {
  name?: string | null;
  email: string;
}

export interface NormalizedEmailMessage {
  externalId: string;
  threadId?: string | null;
  from?: NormalizedEmailAddress | null;
  to: NormalizedEmailAddress[];
  cc: NormalizedEmailAddress[];
  bcc: NormalizedEmailAddress[];
  subject: string;
  snippet?: string | null;
  bodyPreview?: string | null;
  sentAt?: string | null;
  receivedAt?: string | null;
}

export interface EmailSyncResult {
  messages: NormalizedEmailMessage[];
  cursor?: string | null;
}
