/**
 * Receipt Numbering - Generate local receipt numbers for offline POS
 * Platform-agnostic receipt number generation
 */
export class ReceiptNumbering {
  /**
   * Generate local receipt number with register prefix
   * Format: {registerPrefix}-{timestamp}-{sequence}
   * Example: REG1-20250315-001
   */
  generateLocalReceiptNumber(
    registerPrefix: string,
    sequence: number,
    date: Date = new Date()
  ): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}${month}${day}`;
    const seqStr = String(sequence).padStart(3, "0");

    return `${registerPrefix}-${dateStr}-${seqStr}`;
  }

  /**
   * Parse local receipt number
   */
  parseLocalReceiptNumber(receiptNumber: string): {
    registerPrefix: string;
    dateStr: string;
    sequence: number;
  } | null {
    const parts = receiptNumber.split("-");
    if (parts.length !== 3) {
      return null;
    }

    const [registerPrefix, dateStr, seqStr] = parts;
    const sequence = parseInt(seqStr, 10);

    if (isNaN(sequence)) {
      return null;
    }

    return { registerPrefix, dateStr, sequence };
  }

  /**
   * Generate register prefix from register name
   * Example: "Front Desk iPad" -> "FRONT"
   */
  generateRegisterPrefix(registerName: string): string {
    // Take first word, uppercase, max 6 chars
    const firstWord = registerName.split(/\s+/)[0] || "REG";
    return firstWord.toUpperCase().substring(0, 6);
  }
}
