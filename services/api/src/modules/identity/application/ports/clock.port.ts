/**
 * Clock Port (Interface)
 * Abstracts time/date operations for testability
 */
export interface IClock {
  /**
   * Get current date
   */
  now(): Date;

  /**
   * Get current timestamp in milliseconds
   */
  nowMs(): number;
}

export const CLOCK_TOKEN = Symbol('CLOCK');
