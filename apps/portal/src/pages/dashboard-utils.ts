export type PortalStudent = {
  id: string;
  displayName?: string;
  name?: string;
};

export type PortalProfile = {
  students?: PortalStudent[];
};

export type PortalMaterial = {
  id: string;
  title?: string;
  createdAt: string;
  linkedTo?: string;
  studentId?: string;
};

export type PortalInvoice = {
  id: string;
  number: string | null;
  status: string;
  invoiceDate: string | null;
  dueDate: string | null;
  issuedAt: string | null;
  createdAt: string;
  currency: string;
  totals: {
    totalCents: number;
    dueCents: number;
  };
};

export const INVOICE_STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-700/40 text-slate-200 border-slate-600",
  ISSUED: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  SENT: "bg-sky-500/10 text-sky-300 border-sky-500/30",
  PAID: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  CANCELED: "bg-rose-500/10 text-rose-300 border-rose-500/30",
};

export const formatMoney = (cents: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
};

export const formatDate = (value: string | null | undefined) => {
  if (!value) {
    return "-";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleDateString();
};
