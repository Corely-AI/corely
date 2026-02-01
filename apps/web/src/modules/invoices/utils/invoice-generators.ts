export const generateInvoiceNumber = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const prefix = `${y}${m}${d}`;

  try {
    if (typeof window === "undefined" || !window.localStorage) {
      throw new Error("no window");
    }
    const key = "invoice-number-seq";
    const stored = window.localStorage.getItem(key);
    const [storedPrefix, storedCounter] = stored?.split("-") ?? [];
    const counter = storedPrefix === prefix ? Math.max(Number(storedCounter) + 1, 1) : 1;
    const next = `${prefix}-${String(counter).padStart(3, "0")}`;
    window.localStorage.setItem(key, `${prefix}-${counter}`);
    return next;
  } catch {
    const fallback = String(now.getTime()).slice(-5);
    return `${prefix}-${fallback}`;
  }
};
