import type { KnowledgeCitation } from "@corely/contracts";
import type { ProcedureRecord } from "./procedure";

const MAX_PASSAGES = 12;
const MAX_QUOTE_LENGTH = 480;
const commonWords = new Set([
  "about",
  "could",
  "does",
  "from",
  "have",
  "might",
  "please",
  "should",
  "that",
  "their",
  "them",
  "there",
  "these",
  "they",
  "this",
  "what",
  "when",
  "where",
  "which",
  "will",
  "with",
  "would",
  "eine",
  "einen",
  "einer",
  "eines",
  "haben",
  "kann",
  "keine",
  "muss",
  "nicht",
  "sind",
  "soll",
  "über",
  "wann",
  "welche",
  "welcher",
  "welches",
  "wird",
  "wurde",
  "bằng",
  "chính",
  "chúng",
  "được",
  "không",
  "muốn",
  "những",
  "thế",
  "theo",
  "trong",
]);
const normalized = (text: string) => text.normalize("NFKC").toLowerCase();
const words = (text: string) => normalized(text).match(/\p{L}{3,}|\p{N}+/gu) ?? [];

export function findProcedurePassages(
  question: string,
  records: readonly ProcedureRecord[],
  today: string
): KnowledgeCitation[] {
  const terms = [...new Set(words(question).filter((word) => !commonWords.has(word)))].slice(0, 24);
  if (!terms.length) {
    return [];
  }
  const candidates = records.flatMap((record) => {
    const publication = record.published;
    if (record.archivedAt || publication?.content.kind !== "page") {
      return [];
    }
    const title = normalized(publication.title);
    const titleMatches = terms.filter((term) => title.includes(term)).length;
    return publication.content.text
      .split(/\n+|(?<=[.!?])\s+/u)
      .map((text) => text.trim().slice(0, MAX_QUOTE_LENGTH))
      .flatMap((quote) => {
        const passage = normalized(quote);
        const matches = terms.filter((term) => passage.includes(term)).length;
        if (!quote || matches === 0) {
          return [];
        }
        return [
          {
            score: matches * 2 + titleMatches,
            id: record.id,
            title: publication.title,
            quote,
            version: publication.version,
            publishedAt: publication.publishedAt,
            reviewDate: publication.reviewDate,
            reviewOverdue: publication.reviewDate < today,
          },
        ];
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, 3);
  });
  return candidates
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    .slice(0, MAX_PASSAGES)
    .map(({ score: _score, ...citation }) => citation);
}
