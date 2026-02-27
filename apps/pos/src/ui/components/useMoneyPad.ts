import { useMemo, useState } from "react";

export function useMoneyPad(initialValue = "") {
  const [value, setValue] = useState(initialValue);

  const append = (key: string) => {
    setValue((current) => {
      if (key === ".") {
        if (current.includes(".")) {
          return current;
        }
        return current ? `${current}.` : "0.";
      }
      return `${current}${key}`;
    });
  };

  const backspace = () => {
    setValue((current) => current.slice(0, -1));
  };

  const clear = () => {
    setValue("");
  };

  const cents = useMemo(() => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    return Math.round(parsed * 100);
  }, [value]);

  return {
    value,
    setValue,
    cents,
    append,
    backspace,
    clear,
  };
}
