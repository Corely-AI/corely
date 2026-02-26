export const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const catalogImagePlaceholder = (seed: string): string =>
  `https://picsum.photos/seed/corely-${encodeURIComponent(seed)}/960/960`;
