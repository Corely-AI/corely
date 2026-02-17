#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { extname } from "node:path";

const MAX_LINES = 500;
const SOURCE_EXTENSIONS = new Set([
  ".c",
  ".cc",
  ".cpp",
  ".cs",
  ".cts",
  ".cxx",
  ".go",
  ".h",
  ".hh",
  ".hpp",
  ".java",
  ".js",
  ".jsx",
  ".kt",
  ".kts",
  ".mjs",
  ".mts",
  ".php",
  ".py",
  ".rb",
  ".rs",
  ".scala",
  ".sh",
  ".sql",
  ".swift",
  ".ts",
  ".tsx",
  ".vue",
  ".svelte",
  ".html",
  ".css",
  ".scss",
  ".less",
]);
const SOURCE_SUFFIXES = [".d.ts", ".d.mts", ".d.cts"];
const E2E_TEST_SUFFIXES = [".e2e.test.ts", ".e2e.test.tsx", ".e2e.spec.ts", ".e2e.spec.tsx"];

const execGit = (args) =>
  execFileSync("git", args, { encoding: "utf8", maxBuffer: 1024 * 1024 * 50 }).trim();

const getStagedFiles = () => {
  const output = execGit(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]);
  return output ? output.split(/\r?\n/).filter(Boolean) : [];
};

const isSourceFile = (file) => {
  if (SOURCE_SUFFIXES.some((suffix) => file.endsWith(suffix))) {
    return true;
  }
  const extension = extname(file);
  return extension ? SOURCE_EXTENSIONS.has(extension) : false;
};

const isExcludedFromLineLimit = (file) => {
  const normalized = file.replace(/\\/g, "/");
  if (normalized.startsWith("apps/e2e/tests/")) {
    return true;
  }
  if (normalized.startsWith("apps/web/src/modules/crm/screens/")) {
    return true;
  }
  return E2E_TEST_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
};

const countLines = (text) => {
  if (text.length === 0) {
    return 0;
  }
  let count = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "\n") {
      count += 1;
    }
  }
  return text.endsWith("\n") ? count : count + 1;
};

const getStagedContent = (file) =>
  execFileSync("git", ["show", `:${file}`], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 50,
  });

const main = () => {
  const stagedFiles = getStagedFiles().filter(
    (file) => isSourceFile(file) && !isExcludedFromLineLimit(file)
  );
  if (stagedFiles.length === 0) {
    return;
  }

  const oversized = [];
  for (const file of stagedFiles) {
    const content = getStagedContent(file);
    const lineCount = countLines(content);
    if (lineCount > MAX_LINES) {
      oversized.push({ file, lineCount });
    }
  }

  if (oversized.length > 0) {
    console.error(`❌ Commit blocked: source files must be ${MAX_LINES} lines or fewer.`);
    for (const { file, lineCount } of oversized) {
      console.error(`- ${file} (${lineCount} lines)`);
    }
    console.error("Split the file or refactor before committing.");
    process.exit(1);
  }
};

main();
