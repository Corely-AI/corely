const splitSentences = (text: string): string[] =>
  text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

export const buildSummary = (input: {
  excerpt?: string | null;
  contentText?: string | null;
  fallback: string;
  maxSentences?: number;
}): string => {
  if (input.excerpt) {
    return input.excerpt;
  }
  if (input.contentText) {
    const sentences = splitSentences(input.contentText).slice(0, input.maxSentences ?? 2);
    if (sentences.length > 0) {
      return sentences.join(" ");
    }
  }
  return input.fallback;
};

export const buildBulletList = (items: Array<string | null | undefined>): string[] =>
  items.filter((item): item is string => Boolean(item));
