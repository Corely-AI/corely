import type { TaxEurLineDto, TaxEurStatementDto } from "@corely/contracts";
import type { BuildEurStatementParams } from "../../../domain/ports/jurisdiction-pack.port";

type EurLineDefinition = {
  id: string;
  label: string;
  group: "INCOME" | "EXPENSE";
  sourceKeys: string[];
};

const DE_EUR_LINE_DEFINITIONS: EurLineDefinition[] = [
  {
    id: "income.sales",
    label: "Umsatzerloese",
    group: "INCOME",
    sourceKeys: ["income.sales"],
  },
  {
    id: "income.other",
    label: "Sonstige betriebliche Ertraege",
    group: "INCOME",
    sourceKeys: ["income.other"],
  },
  {
    id: "expense.rent",
    label: "Raumkosten (Miete/Nebenkosten)",
    group: "EXPENSE",
    sourceKeys: ["expense.rent", "expense.office"],
  },
  {
    id: "expense.software",
    label: "Software und Abonnements",
    group: "EXPENSE",
    sourceKeys: ["expense.software", "expense.tools"],
  },
  {
    id: "expense.travel",
    label: "Reisekosten",
    group: "EXPENSE",
    sourceKeys: ["expense.travel"],
  },
  {
    id: "expense.marketing",
    label: "Werbung und Marketing",
    group: "EXPENSE",
    sourceKeys: ["expense.marketing", "expense.advertising"],
  },
  {
    id: "expense.professional",
    label: "Beratung und Fremdleistungen",
    group: "EXPENSE",
    sourceKeys: ["expense.professional", "expense.consulting", "expense.fees"],
  },
  {
    id: "expense.taxes",
    label: "Steuern, Gebuehren und Abgaben",
    group: "EXPENSE",
    sourceKeys: ["expense.taxes", "expense.fees"],
  },
  {
    id: "expense.other",
    label: "Sonstige unbeschraenkt abziehbare Betriebsausgaben",
    group: "EXPENSE",
    sourceKeys: ["expense.other"],
  },
];

function sumCategoryValues(input: Record<string, number>, keys: string[]): number {
  return keys.reduce((total, key) => total + (input[key] ?? 0), 0);
}

function toTitleCaseCategoryLabel(key: string): string {
  const raw = key.replace(/^income\.|^expense\./, "");
  if (!raw) {
    return key;
  }
  return raw
    .split(/[._-]+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function collectDefinedKeys(definitions: EurLineDefinition[]): Set<string> {
  const keys = new Set<string>();
  for (const definition of definitions) {
    for (const sourceKey of definition.sourceKeys) {
      keys.add(sourceKey);
    }
  }
  return keys;
}

function buildUnknownCategoryLines(params: {
  group: "INCOME" | "EXPENSE";
  categories: Record<string, number>;
  knownKeys: Set<string>;
}): TaxEurLineDto[] {
  return Object.entries(params.categories)
    .filter(([key, amount]) => !params.knownKeys.has(key) && amount !== 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, amount]) => ({
      id: key,
      label: toTitleCaseCategoryLabel(key),
      group: params.group,
      amountCents: amount,
    }));
}

export function buildDeEurStatement(params: BuildEurStatementParams): TaxEurStatementDto {
  const lines: TaxEurLineDto[] = [];
  const knownKeys = collectDefinedKeys(DE_EUR_LINE_DEFINITIONS);

  for (const definition of DE_EUR_LINE_DEFINITIONS) {
    const source =
      definition.group === "INCOME" ? params.incomeByCategory : params.expenseByCategory;
    const amount = sumCategoryValues(source, definition.sourceKeys);
    lines.push({
      id: definition.id,
      label: definition.label,
      group: definition.group,
      amountCents: amount,
    });
  }

  lines.push(
    ...buildUnknownCategoryLines({
      group: "INCOME",
      categories: params.incomeByCategory,
      knownKeys,
    }),
    ...buildUnknownCategoryLines({
      group: "EXPENSE",
      categories: params.expenseByCategory,
      knownKeys,
    })
  );

  const incomeCents = lines
    .filter((line) => line.group === "INCOME")
    .reduce((sum, line) => sum + line.amountCents, 0);
  const expenseCents = lines
    .filter((line) => line.group === "EXPENSE")
    .reduce((sum, line) => sum + line.amountCents, 0);

  return {
    year: params.year,
    currency: params.currency,
    jurisdiction: "DE",
    basis: params.basis,
    lines,
    totals: {
      incomeCents,
      expenseCents,
      profitCents: incomeCents - expenseCents,
    },
    generatedAt: params.generatedAt.toISOString(),
  };
}
