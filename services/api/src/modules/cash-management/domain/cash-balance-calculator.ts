import { CashEntryDirection } from "@corely/contracts";

export type BalanceInputEntry = {
  direction: CashEntryDirection;
  amountCents: number;
};

export class CashBalanceCalculator {
  static applyDelta(currentBalanceCents: number, entry: BalanceInputEntry): number {
    return entry.direction === CashEntryDirection.OUT
      ? currentBalanceCents - entry.amountCents
      : currentBalanceCents + entry.amountCents;
  }

  static deriveExpectedBalance(openingBalanceCents: number, entries: BalanceInputEntry[]): number {
    return entries.reduce(
      (running, entry) => CashBalanceCalculator.applyDelta(running, entry),
      openingBalanceCents
    );
  }
}
