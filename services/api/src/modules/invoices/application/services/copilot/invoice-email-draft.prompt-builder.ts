const MISSING_BANK_DETAILS_LINE = "Please pay using the bank details shown on the invoice.";

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
