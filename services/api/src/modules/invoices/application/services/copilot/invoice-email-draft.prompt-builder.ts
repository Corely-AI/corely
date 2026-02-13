import type {
  InvoiceEmailDraftLanguage,
  InvoiceIssueEmailDraftTone,
  InvoiceReminderEmailDraftTone,
} from "@corely/contracts";

const MISSING_BANK_DETAILS_LINE = "Please pay using the bank details shown on the invoice.";

type ReminderTone = InvoiceReminderEmailDraftTone;
type IssueTone = InvoiceIssueEmailDraftTone;

type DraftFacts = {
  invoiceNumber: string | null;
  invoiceStatus: string;
  customerName: string | null;
  dueDate: string | null;
  currency: string;
  amountDueCents: number;
  amountDueDisplay: string;
  bankDetails: {
    accountHolderName: string | null;
    bankName: string | null;
    iban: string | null;
    bic: string | null;
    paymentReference: string | null;
  };
  hasBankDetails: boolean;
  brandName: string | null;
};

type PromptPayload = {
  systemPrompt: string;
  userPrompt: string;
};

const languageInstruction = (language: InvoiceEmailDraftLanguage): string => {
  switch (language) {
    case "de":
      return "Write in German (de). Keep wording simple and natural.";
    case "vi":
      return "Write in Vietnamese (vi). Keep wording simple and polite.";
    default:
      return "Write in English (en).";
  }
};

const issueToneInstruction = (tone: IssueTone): string => {
  return tone === "friendly"
    ? "Tone: friendly and warm, but professional."
    : "Tone: neutral and professional.";
};

const reminderToneInstruction = (tone: ReminderTone): string => {
  if (tone === "polite") {
    return "Tone: polite and gentle.";
  }
  if (tone === "firm") {
    return "Tone: firm but respectful. No threats, no legal pressure.";
  }
  return "Tone: normal and professional.";
};

const baseSystemPrompt = (language: InvoiceEmailDraftLanguage): string => {
  return [
    "You are Corely Invoice Copilot.",
    languageInstruction(language),
    "Use ONLY facts provided in the user prompt.",
    "If a field is missing, do not guess.",
    `If bank details are missing, include this exact sentence: "${MISSING_BANK_DETAILS_LINE}"`,
    "If due date is missing, omit the date or use 'as soon as possible'.",
    "Never include threats, legal claims, legal deadlines, debt collection, court actions, or penalties.",
    "Output must be EXACTLY this format:",
    "Subject: <one line>",
    "",
    "<body text>",
    "No markdown. No HTML.",
  ].join("\n");
};

export const buildIssueEmailDraftPrompt = (args: {
  language: InvoiceEmailDraftLanguage;
  tone: IssueTone;
  facts: DraftFacts;
}): PromptPayload => {
  return {
    systemPrompt: [baseSystemPrompt(args.language), issueToneInstruction(args.tone)].join("\n\n"),
    userPrompt: [
      "Draft type: FIRST SEND (invoice issued/sent notification)",
      "Facts (JSON):",
      JSON.stringify(args.facts, null, 2),
      "Goal: short email that confirms invoice is issued/sent and includes payment details when present.",
    ].join("\n"),
  };
};

export const buildReminderEmailDraftPrompt = (args: {
  language: InvoiceEmailDraftLanguage;
  tone: ReminderTone;
  facts: DraftFacts;
}): PromptPayload => {
  return {
    systemPrompt: [baseSystemPrompt(args.language), reminderToneInstruction(args.tone)].join(
      "\n\n"
    ),
    userPrompt: [
      "Draft type: PAYMENT REMINDER",
      "Facts (JSON):",
      JSON.stringify(args.facts, null, 2),
      "Goal: short reminder that asks for payment and provides the safest next step.",
      "If amountDueCents <= 0, do not draft payment requests.",
    ].join("\n"),
  };
};

export const parseEmailDraftOutput = (raw: string): { subject: string; body: string } => {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return { subject: "", body: "" };
  }

  const lines = normalized.split("\n");
  const firstLine = lines[0]?.trim() ?? "";

  if (firstLine.toLowerCase().startsWith("subject:")) {
    const subject = firstLine.slice("subject:".length).trim();
    const body = lines
      .slice(1)
      .join("\n")
      .replace(/^\s*body:\s*/i, "")
      .trim();

    return { subject, body };
  }

  const [subjectLine, ...rest] = lines;
  return {
    subject: subjectLine.trim(),
    body: rest
      .join("\n")
      .replace(/^\s*body:\s*/i, "")
      .trim(),
  };
};

export const sanitizeEmailDraftBody = (args: { body: string; hasBankDetails: boolean }): string => {
  const input = args.body.trim();
  if (args.hasBankDetails) {
    return input;
  }

  const stripped = input
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/(^|\b)(iban|bic|swift)(\b|:)/i.test(line));

  if (!stripped.some((line) => line === MISSING_BANK_DETAILS_LINE)) {
    stripped.push(MISSING_BANK_DETAILS_LINE);
  }

  return stripped.join("\n\n");
};

export const getMissingBankDetailsFallbackLine = (): string => MISSING_BANK_DETAILS_LINE;
