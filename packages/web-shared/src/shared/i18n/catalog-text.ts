export type ScreenCatalog = Readonly<Record<string, Readonly<Record<string, string>>>>;

export function catalogText(catalog: ScreenCatalog, key: string): string | undefined {
  const separator = key.lastIndexOf(".");
  return catalog[key.slice(0, separator)]?.[key.slice(separator + 1)];
}
