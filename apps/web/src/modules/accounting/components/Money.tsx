import type { FC } from "react";

interface MoneyProps {
  amountCents: number;
  currency: string;
  className?: string;
  showSign?: boolean;
}

/**
 * Displays monetary amounts formatted according to currency conventions
 */
export const Money: FC<MoneyProps> = ({
  amountCents,
  currency,
  className = "",
  showSign = false,
}) => {
  const isNegative = amountCents < 0;
  const absAmount = Math.abs(amountCents) / 100;

  // Use the formatting logic, but we can also use formatMoney from kernel if we export it to web
  // For now, let's keep it embedded but aligned
  const formatted = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absAmount);

  const sign = isNegative ? "-" : showSign && amountCents > 0 ? "+" : "";

  return (
    <span
      className={`font-mono tabular-nums ${isNegative ? "text-red-600" : ""} ${className}`}
      id={`money-${currency}-${amountCents}`}
    >
      {sign}
      {formatted}
    </span>
  );
};
