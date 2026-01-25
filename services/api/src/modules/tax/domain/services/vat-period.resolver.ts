import { Injectable } from "@nestjs/common";

export interface VatPeriod {
  key: string; // "2025-Q4"
  label: string; // "Q4 2025"
  start: Date; // Inclusive (UTC)
  end: Date; // Exclusive (UTC)
}

@Injectable()
export class VatPeriodResolver {
  /**
   * Resolve the quarter for a given date or period key
   */
  resolveQuarter(dateOrKey: Date | string): VatPeriod {
    if (typeof dateOrKey === "string") {
      return this.fromKey(dateOrKey);
    }
    return this.fromDate(dateOrKey);
  }

  /**
   * Get periods for a given year
   */
  getQuartersOfYear(year: number): VatPeriod[] {
    return [
      this.fromKey(`${year}-Q1`),
      this.fromKey(`${year}-Q2`),
      this.fromKey(`${year}-Q3`),
      this.fromKey(`${year}-Q4`),
    ];
  }

  private fromDate(date: Date): VatPeriod {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth(); // 0-11

    let q = 1;
    if (month >= 3 && month < 6) q = 2;
    if (month >= 6 && month < 9) q = 3;
    if (month >= 9) q = 4;

    return this.fromKey(`${year}-Q${q}`);
  }

  private fromKey(key: string): VatPeriod {
    // Expected format: YYYY-Qn
    const [yearStr, qStr] = key.split("-");
    const year = parseInt(yearStr, 10);
    const q = parseInt(qStr.replace("Q", ""), 10);

    let startMonth = 0;
    if (q === 2) startMonth = 3;
    if (q === 3) startMonth = 6;
    if (q === 4) startMonth = 9;

    const start = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0, 0));
    
    // End is start of next quarter
    // If Q4 (month 9), next is month 12 (which wraps to 0 of next year in Date.UTC)
    const end = new Date(Date.UTC(year, startMonth + 3, 1, 0, 0, 0, 0));

    return {
      key: `${year}-Q${q}`,
      label: `Q${q} ${year}`,
      start,
      end,
    };
  }
}
