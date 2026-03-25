import type {
  DraftRestaurantOrderItemInput,
  FloorPlanRoom,
  ProductSnapshot,
  RestaurantModifierGroup,
  RestaurantOrderItem,
  RestaurantOrderItemModifier,
} from "@corely/contracts";

const numberWords: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

export const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const scoreTextMatch = (query: string, candidate: string): number => {
  const normalizedQuery = normalize(query);
  const normalizedCandidate = normalize(candidate);
  if (!normalizedQuery || !normalizedCandidate) {
    return 0;
  }
  if (normalizedQuery === normalizedCandidate) {
    return 1;
  }
  if (normalizedCandidate.includes(normalizedQuery)) {
    return 0.92;
  }
  if (normalizedQuery.includes(normalizedCandidate)) {
    return 0.9;
  }

  const queryTokens = normalizedQuery.split(" ");
  const candidateTokens = normalizedCandidate.split(" ");
  const matches = queryTokens.filter((token) =>
    candidateTokens.some((candidateToken) => candidateToken.includes(token))
  ).length;
  return Math.max(0, Math.min(0.89, matches / queryTokens.length));
};

export const splitSegments = (sourceText: string): string[] =>
  sourceText
    .split(/\s*(?:,| and )\s*/i)
    .map((segment) => segment.trim())
    .filter(Boolean);

export const parseQuantityAndName = (
  segment: string
): { quantity: number; itemText: string; modifierText: string } => {
  const trimmed = segment.trim();
  const match = trimmed.match(
    /^(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten)\s+(.+)$/i
  );
  if (!match) {
    return { quantity: 1, itemText: trimmed, modifierText: trimmed };
  }

  const quantityText = normalize(match[1]);
  const quantity = /^\d+$/.test(quantityText)
    ? Number(quantityText)
    : (numberWords[quantityText] ?? 1);
  return { quantity, itemText: match[2].trim(), modifierText: match[2].trim() };
};

export const mapOrderItemToDraft = (item: RestaurantOrderItem): DraftRestaurantOrderItemInput => ({
  id: item.id,
  catalogItemId: item.catalogItemId,
  itemName: item.itemName,
  sku: item.sku,
  quantity: item.quantity,
  unitPriceCents: item.unitPriceCents,
  taxRateBps: item.taxRateBps,
  modifiers: item.modifiers.map((modifier) => ({
    id: modifier.id,
    modifierGroupId: modifier.modifierGroupId,
    optionName: modifier.optionName,
    quantity: modifier.quantity,
    priceDeltaCents: modifier.priceDeltaCents,
  })),
});

export const findBestProductMatches = (query: string, catalogProducts: ProductSnapshot[]) =>
  catalogProducts
    .map((product) => ({
      product,
      confidence: Math.max(
        scoreTextMatch(query, product.name),
        scoreTextMatch(query, product.sku),
        product.barcode ? scoreTextMatch(query, product.barcode) : 0
      ),
    }))
    .filter((match) => match.confidence > 0.15)
    .sort((a, b) => b.confidence - a.confidence);

export const matchModifiers = (
  productId: string,
  segment: string,
  modifierGroups: RestaurantModifierGroup[]
): {
  modifiers: DraftRestaurantOrderItemInput["modifiers"];
  missingRequiredModifiers: Array<{
    catalogItemId: string;
    itemName: string;
    modifierGroupId: string;
    modifierGroupName: string;
  }>;
} => {
  const normalizedSegment = normalize(segment);
  const linkedGroups = modifierGroups.filter((group) =>
    group.linkedCatalogItemIds.includes(productId)
  );
  const modifiers: DraftRestaurantOrderItemInput["modifiers"] = [];
  const missingRequiredModifiers: Array<{
    catalogItemId: string;
    itemName: string;
    modifierGroupId: string;
    modifierGroupName: string;
  }> = [];

  for (const group of linkedGroups) {
    const matchedOptions = group.options.filter((option) => {
      const normalizedOption = normalize(option.name);
      return normalizedOption.length > 0 && normalizedSegment.includes(normalizedOption);
    });
    const selected = group.selectionMode === "SINGLE" ? matchedOptions.slice(0, 1) : matchedOptions;

    if (selected.length === 0) {
      if (group.isRequired) {
        missingRequiredModifiers.push({
          catalogItemId: productId,
          itemName: "",
          modifierGroupId: group.id,
          modifierGroupName: group.name,
        });
      }
      continue;
    }

    for (const option of selected) {
      modifiers.push({
        modifierGroupId: group.id,
        optionName: option.name,
        quantity: 1,
        priceDeltaCents: option.priceDeltaCents,
      });
    }
  }

  return { modifiers, missingRequiredModifiers };
};

export const summarizeDraftAction = (items: DraftRestaurantOrderItemInput[]) =>
  items.length === 0
    ? "No draft changes proposed."
    : `Prepared ${items.reduce((sum, item) => sum + item.quantity, 0)} item(s) for the draft order.`;

export const extractTables = (rooms: FloorPlanRoom[]) =>
  rooms.flatMap((room) => room.tables.map((table) => ({ roomName: room.name, table })));

export const findTableByPhrase = (phrase: string, rooms: FloorPlanRoom[]) => {
  const normalizedPhrase = normalize(phrase);
  return extractTables(rooms)
    .map(({ table }) => ({
      table,
      score: Math.max(
        scoreTextMatch(normalizedPhrase, table.name),
        scoreTextMatch(normalizedPhrase, table.id)
      ),
    }))
    .sort((a, b) => b.score - a.score)[0];
};

export const formatModifierReferences = (modifiers: RestaurantOrderItemModifier[]) =>
  modifiers.length ? modifiers.map((modifier) => modifier.optionName).join(", ") : "No modifiers";
