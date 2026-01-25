import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const repoRoot = process.cwd();

const allowlistPrefixes = [
  "packages/prompts/",
  "docs/prompts/",
  "docs/prompt-management.md",
  "docs/prompt-inventory.md",
  "packages/prompts/README.md",
];

const scanExtensions = new Set([".ts", ".tsx"]);

const patterns = [
  {
    name: "prompt-literal",
    regex: /\bprompt\s*:\s*(["'`])/, // prompt: "..."
  },
  {
    name: "system-instruction",
    regex:
      /\bYou are\b[^\n]{0,200}\b(?:assistant|agent|copilot|language model|model|LLM|system)\b/i,
  },
  {
    name: "system-instruction",
    regex: /\bSystem prompt\b|\bSystem instructions\b/i,
  },
];

const isAllowed = (filePath) =>
  allowlistPrefixes.some((prefix) => filePath.replace(/\\/g, "/").startsWith(prefix));

const files = execSync("git ls-files", { cwd: repoRoot })
  .toString()
  .trim()
  .split("\n")
  .filter(Boolean);

const violations = [];

for (const relPath of files) {
  if (isAllowed(relPath)) {
    continue;
  }
  const ext = path.extname(relPath);
  if (!scanExtensions.has(ext)) {
    continue;
  }
  const absPath = path.join(repoRoot, relPath);
  const content = fs.readFileSync(absPath, "utf8");
  for (const pattern of patterns) {
    if (pattern.regex.test(content)) {
      violations.push({ file: relPath, pattern: pattern.name });
    }
  }
}

if (violations.length) {
  console.error("Prompt guard failed. Inline prompts detected outside packages/prompts:");
  for (const violation of violations) {
    console.error(`- ${violation.file} (${violation.pattern})`);
  }
  process.exit(1);
}

console.log("Prompt guard passed.");
