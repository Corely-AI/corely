import { z } from "zod";

export const DE_EXPENSE_CATEGORIES = [
  {
    value: "MEALS_CLIENT_ENTERTAINMENT",
    labelKey: "expenses.form.categories.MEALS_CLIENT_ENTERTAINMENT",
  },
  { value: "MEALS_TEAM_EMPLOYEE", labelKey: "expenses.form.categories.MEALS_TEAM_EMPLOYEE" },
  {
    value: "GIFTS_BUSINESS_PARTNER",
    labelKey: "expenses.form.categories.GIFTS_BUSINESS_PARTNER",
  },
  {
    value: "GIFTS_PROMO_STREUARTIKEL",
    labelKey: "expenses.form.categories.GIFTS_PROMO_STREUARTIKEL",
  },
  { value: "FINES_PENALTIES", labelKey: "expenses.form.categories.FINES_PENALTIES" },
  {
    value: "CLOTHING_PROTECTIVE_UNIFORM",
    labelKey: "expenses.form.categories.CLOTHING_PROTECTIVE_UNIFORM",
  },
  { value: "CLOTHING_CIVILIAN", labelKey: "expenses.form.categories.CLOTHING_CIVILIAN" },
  { value: "TRAVEL_MEALS_PER_DIEM", labelKey: "expenses.form.categories.TRAVEL_MEALS_PER_DIEM" },
  { value: "HOME_OFFICE_FLAT_RATE", labelKey: "expenses.form.categories.HOME_OFFICE_FLAT_RATE" },
  { value: "PHONE_INTERNET", labelKey: "expenses.form.categories.PHONE_INTERNET" },
  { value: "CAR", labelKey: "expenses.form.categories.CAR" },
  { value: "HOME_INTERNET", labelKey: "expenses.form.categories.HOME_INTERNET" },
  { value: "office_supplies", labelKey: "expenses.form.categories.office_supplies" },
  { value: "software", labelKey: "expenses.form.categories.software" },
  { value: "travel", labelKey: "expenses.form.categories.travel" },
  { value: "meals", labelKey: "expenses.form.categories.meals" },
  { value: "home_office", labelKey: "expenses.form.categories.home_office" },
  { value: "education", labelKey: "expenses.form.categories.education" },
  { value: "hardware", labelKey: "expenses.form.categories.hardware" },
  { value: "phone_internet", labelKey: "expenses.form.categories.phone_internet" },
  { value: "other", labelKey: "expenses.form.categories.other" },
] as const;

interface CategoryFieldRequirements {
  participants?: boolean;
  occasion?: boolean;
  recipient?: boolean;
  businessUsePercent?: boolean;
  travelMeta?: boolean;
  homeOfficeDays?: boolean;
}

export const CATEGORY_REQUIREMENTS: Record<string, CategoryFieldRequirements> = {
  MEALS_CLIENT_ENTERTAINMENT: { participants: true, occasion: true },
  meals: { participants: true, occasion: true },
  GIFTS_BUSINESS_PARTNER: { recipient: true },
  TRAVEL_MEALS_PER_DIEM: { travelMeta: true },
  HOME_OFFICE_FLAT_RATE: { homeOfficeDays: true },
  PHONE_INTERNET: { businessUsePercent: true },
  CAR: { businessUsePercent: true },
  HOME_INTERNET: { businessUsePercent: true },
  phone_internet: { businessUsePercent: true },
};

export const expenseFormSchema = z.object({
  merchantName: z.string().min(1, "Merchant is required"),
  expenseDate: z.string().min(1, "Date is required"),
  amount: z.string().min(1, "Amount is required"),
  currency: z.string().default("EUR"),
  category: z.string().optional(),
  vatRate: z.string().optional(),
  notes: z.string().optional(),
  participants: z.string().optional(),
  occasion: z.string().optional(),
  recipient: z.string().optional(),
  businessUsePercent: z.coerce.number().int().min(0).max(100).optional(),
  homeOfficeDays: z.coerce.number().int().min(0).optional(),
  travelDate: z.string().optional(),
  absenceHours: z.coerce.number().min(0).optional(),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export const VAT_OPTIONS = ["0", "7", "19"];

const ACCEPTED_RECEIPT_MIME_TYPES = new Set(["application/pdf"]);
const ACCEPTED_RECEIPT_EXTENSIONS = new Set([
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
  ".heic",
  ".heif",
  ".tif",
  ".tiff",
  ".svg",
]);

export const MAX_RECEIPT_SIZE_BYTES = 10 * 1024 * 1024;

export const isSupportedReceipt = (file: File): boolean => {
  const fileName = file.name.toLowerCase();
  const dotIndex = fileName.lastIndexOf(".");
  const extension = dotIndex >= 0 ? fileName.slice(dotIndex) : "";
  return (
    file.type.startsWith("image/") ||
    ACCEPTED_RECEIPT_MIME_TYPES.has(file.type) ||
    ACCEPTED_RECEIPT_EXTENSIONS.has(extension)
  );
};

type PreviewTone = "green" | "amber" | "red" | "blue" | null;

export function previewDeductibility(
  category: string | undefined,
  amountStr: string | undefined,
  businessUsePercent: number | undefined
): {
  percent: number | null;
  labelKey: string;
  labelValues?: Record<string, string | number>;
  tone: PreviewTone;
} {
  const amount = parseFloat(amountStr ?? "0") || 0;
  if (!category || amount <= 0) {
    return { percent: null, labelKey: "expenses.form.preview.empty", tone: null };
  }

  const pctMap: Record<string, number> = {
    MEALS_CLIENT_ENTERTAINMENT: 70,
    meals: 70,
    MEALS_TEAM_EMPLOYEE: 100,
    GIFTS_PROMO_STREUARTIKEL: 100,
    FINES_PENALTIES: 0,
    CLOTHING_CIVILIAN: 0,
    CLOTHING_PROTECTIVE_UNIFORM: 100,
    office_supplies: 100,
    software: 100,
    travel: 100,
    home_office: 100,
    education: 100,
    hardware: 100,
    other: 100,
  };

  if (pctMap[category] !== undefined) {
    const pct = pctMap[category];
    const tone = pct === 100 ? "green" : pct === 0 ? "red" : "amber";
    return {
      percent: pct,
      labelKey: "expenses.form.preview.deductiblePercent",
      labelValues: { percent: pct },
      tone,
    };
  }

  if (
    category === "PHONE_INTERNET" ||
    category === "CAR" ||
    category === "HOME_INTERNET" ||
    category === "phone_internet"
  ) {
    if (businessUsePercent != null) {
      const tone = businessUsePercent >= 50 ? "green" : "amber";
      return {
        percent: businessUsePercent,
        labelKey: "expenses.form.preview.mixedUse",
        labelValues: { percent: businessUsePercent },
        tone,
      };
    }
    return { percent: null, labelKey: "expenses.form.preview.enterBusinessUse", tone: "blue" };
  }

  if (category === "TRAVEL_MEALS_PER_DIEM") {
    return { percent: null, labelKey: "expenses.form.preview.perDiemServer", tone: "blue" };
  }

  if (category === "HOME_OFFICE_FLAT_RATE") {
    return { percent: null, labelKey: "expenses.form.preview.homeOfficeRate", tone: "blue" };
  }

  if (category === "GIFTS_BUSINESS_PARTNER") {
    return { percent: null, labelKey: "expenses.form.preview.giftThreshold", tone: "amber" };
  }

  return { percent: null, labelKey: "expenses.form.preview.empty", tone: null };
}
