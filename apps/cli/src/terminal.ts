import { stripVTControlCharacters } from "node:util";

export function terminalLabel(value: string): string {
  return stripVTControlCharacters(value)
    .replace(/[\p{Cc}\s]+/gu, " ")
    .trim();
}
