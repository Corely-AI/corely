import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, basename } from "node:path";
import { corelyLocales } from "../packages/contracts/src/localization.ts";

const existingLocales = new Set(["en", "de", "vi"]);
const pluralSuffix = /_(zero|one|two|few|many|other)$/;
const token = /\{\{[^{}]+\}\}|\{[a-zA-Z][\w.]*\}|<\/?[a-zA-Z0-9][^<>]*>/g;
const issues = [];
let checked = 0;

function leaves(value, prefix = "") {
  if (typeof value === "string") {
    return [[prefix, value]];
  }
  return Object.entries(value).flatMap(([key, item]) =>
    leaves(item, prefix ? `${prefix}.${key}` : key)
  );
}

function checkCatalog(source, catalog, locale, path) {
  const sourceEntries = new Map(leaves(source));
  const translatedEntries = new Map(leaves(catalog));
  const report = (key, reason) => issues.push(`${path} [${locale}] ${key} ${reason}`);
  for (const [key, english] of sourceEntries) {
    const message = translatedEntries.get(key);
    if (message === undefined || (english.trim() && !message.trim())) {
      report(key, "is missing or empty");
      continue;
    }
    const sourceTokens = english.match(token) ?? [];
    const actualTokens = message.match(token) ?? [];
    const needsCount = /\.(inDays|overdue)_one$/.test(key) && (locale === "pl" || locale === "ru");
    if (needsCount) {
      sourceTokens.push("{{count}}");
    }
    if (sourceTokens.sort().join() !== actualTokens.sort().join() || /ZXQ\d+QXZ|⟦⟧/.test(message)) {
      report(key, "has invalid placeholders");
    }
    if (key.endsWith("_one")) {
      for (const category of new Intl.PluralRules(locale).resolvedOptions().pluralCategories) {
        const pluralKey = key.replace(pluralSuffix, `_${category}`);
        if (!translatedEntries.get(pluralKey)) {
          report(pluralKey, "is missing a plural form");
        }
      }
    }
  }
  for (const key of translatedEntries.keys()) {
    if (!sourceEntries.has(key) && !sourceEntries.has(key.replace(pluralSuffix, "_one"))) {
      report(key, "does not exist in English");
    }
  }
  checked += 1;
}

const listed = execFileSync(
  "git",
  [
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "--",
    ":(glob)apps/**/locales/*.json",
    ":(glob)packages/**/locales/*.json",
  ],
  { encoding: "utf8" }
);
const filenames = new Set(listed.trim().split(/\r?\n/).filter(Boolean));
const read = (file) => JSON.parse(readFileSync(file, "utf8"));
for (const file of filenames) {
  if (basename(file) === "en.json") {
    const source = read(file);
    for (const locale of corelyLocales.filter((value) => !existingLocales.has(value))) {
      const path = `${dirname(file)}/${locale}.json`;
      if (!filenames.has(path)) {
        issues.push(`${path} catalog is missing`);
        continue;
      }
      checkCatalog(source, read(path), locale, path);
    }
  } else if (!corelyLocales.some((locale) => basename(file) === `${locale}.json`)) {
    const messages = read(file);
    if (!messages.en) {
      continue;
    }
    for (const locale of corelyLocales.filter((value) => !existingLocales.has(value))) {
      if (!messages[locale]) {
        issues.push(`${file} [${locale}] catalog is missing`);
        continue;
      }
      checkCatalog(messages.en, messages[locale], locale, file);
    }
  }
}

for (const issue of issues) {
  console.error(issue);
}
console.log(`Checked ${checked} locale catalogs. ${issues.length} errors.`);
process.exitCode = issues.length ? 1 : 0;
