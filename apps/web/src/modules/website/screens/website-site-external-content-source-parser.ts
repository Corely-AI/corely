import { isRecord } from "./website-site-external-content-generator";

type ImportBinding = {
  imported: string;
  local: string;
};

const extractBalancedSegment = (
  source: string,
  startIndex: number,
  open: string,
  close: string
): string | null => {
  if (source[startIndex] !== open) {
    return null;
  }

  let depth = 0;
  let quote: '"' | "'" | "`" | null = null;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];
    const nextChar = source[index + 1];

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && nextChar === "/") {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "/" && nextChar === "/") {
      inLineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && nextChar === "*") {
      inBlockComment = true;
      index += 1;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      continue;
    }

    if (char === open) {
      depth += 1;
      continue;
    }
    if (char === close) {
      depth -= 1;
      if (depth === 0) {
        return source.slice(startIndex, index + 1);
      }
    }
  }

  return null;
};

const extractTopLevelObjectKeys = (objectLiteral: string): string[] => {
  if (objectLiteral.length < 2) {
    return [];
  }

  const body = objectLiteral.slice(1, -1);
  const keys: string[] = [];
  let index = 0;

  const consumeWhitespaceAndComments = () => {
    while (index < body.length) {
      const char = body[index];
      const nextChar = body[index + 1];
      if (/\s/.test(char) || char === ",") {
        index += 1;
        continue;
      }
      if (char === "/" && nextChar === "/") {
        index += 2;
        while (index < body.length && body[index] !== "\n") {
          index += 1;
        }
        continue;
      }
      if (char === "/" && nextChar === "*") {
        index += 2;
        while (index < body.length - 1 && !(body[index] === "*" && body[index + 1] === "/")) {
          index += 1;
        }
        index += 2;
        continue;
      }
      break;
    }
  };

  const consumeQuotedKey = (quote: "'" | '"'): string => {
    index += 1;
    let value = "";
    let escaped = false;
    while (index < body.length) {
      const char = body[index];
      if (escaped) {
        value += char;
        escaped = false;
        index += 1;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        index += 1;
        continue;
      }
      if (char === quote) {
        index += 1;
        break;
      }
      value += char;
      index += 1;
    }
    return value;
  };

  const consumeValueUntilComma = () => {
    let curlyDepth = 0;
    let squareDepth = 0;
    let parenDepth = 0;
    let quote: '"' | "'" | "`" | null = null;
    let escaped = false;
    let inLineComment = false;
    let inBlockComment = false;

    while (index < body.length) {
      const char = body[index];
      const nextChar = body[index + 1];

      if (inLineComment) {
        index += 1;
        if (char === "\n") {
          inLineComment = false;
        }
        continue;
      }

      if (inBlockComment) {
        if (char === "*" && nextChar === "/") {
          inBlockComment = false;
          index += 2;
          continue;
        }
        index += 1;
        continue;
      }

      if (quote) {
        if (escaped) {
          escaped = false;
          index += 1;
          continue;
        }
        if (char === "\\") {
          escaped = true;
          index += 1;
          continue;
        }
        if (char === quote) {
          quote = null;
        }
        index += 1;
        continue;
      }

      if (char === "/" && nextChar === "/") {
        inLineComment = true;
        index += 2;
        continue;
      }
      if (char === "/" && nextChar === "*") {
        inBlockComment = true;
        index += 2;
        continue;
      }
      if (char === "'" || char === '"' || char === "`") {
        quote = char;
        index += 1;
        continue;
      }

      if (char === "{") {
        curlyDepth += 1;
        index += 1;
        continue;
      }
      if (char === "}") {
        if (curlyDepth > 0) {
          curlyDepth -= 1;
          index += 1;
          continue;
        }
      }
      if (char === "[") {
        squareDepth += 1;
        index += 1;
        continue;
      }
      if (char === "]") {
        if (squareDepth > 0) {
          squareDepth -= 1;
          index += 1;
          continue;
        }
      }
      if (char === "(") {
        parenDepth += 1;
        index += 1;
        continue;
      }
      if (char === ")") {
        if (parenDepth > 0) {
          parenDepth -= 1;
          index += 1;
          continue;
        }
      }

      if (char === "," && curlyDepth === 0 && squareDepth === 0 && parenDepth === 0) {
        return;
      }

      index += 1;
    }
  };

  while (index < body.length) {
    consumeWhitespaceAndComments();
    if (index >= body.length) {
      break;
    }

    if (body.slice(index, index + 3) === "...") {
      index += 3;
      consumeValueUntilComma();
      if (body[index] === ",") {
        index += 1;
      }
      continue;
    }

    let key: string | null = null;
    const current = body[index];

    if (current === '"' || current === "'") {
      key = consumeQuotedKey(current);
    } else {
      const identifier = /^[A-Za-z_$][A-Za-z0-9_$-]*/.exec(body.slice(index));
      if (identifier) {
        key = identifier[0];
        index += identifier[0].length;
      }
    }

    if (!key) {
      consumeValueUntilComma();
      if (body[index] === ",") {
        index += 1;
      }
      continue;
    }

    consumeWhitespaceAndComments();
    if (body[index] !== ":") {
      consumeValueUntilComma();
      if (body[index] === ",") {
        index += 1;
      }
      continue;
    }

    keys.push(key);
    index += 1;
    consumeValueUntilComma();
    if (body[index] === ",") {
      index += 1;
    }
  }

  return Array.from(new Set(keys));
};

export const extractSchemaRootKeys = (source: string): string[] => {
  const directIndex = source.indexOf("z.object");
  const chainedMatch = source.match(/\.object\s*\(/);
  const schemaIndex = directIndex >= 0 ? directIndex : (chainedMatch?.index ?? -1);
  if (schemaIndex < 0) {
    return [];
  }

  const braceStart = source.indexOf("{", schemaIndex);
  if (braceStart < 0) {
    return [];
  }

  const objectLiteral = extractBalancedSegment(source, braceStart, "{", "}");
  if (!objectLiteral) {
    return [];
  }
  return extractTopLevelObjectKeys(objectLiteral);
};

const extractImportBindings = (source: string): ImportBinding[] => {
  const bindings: ImportBinding[] = [];
  const matches = source.matchAll(/import\s*{([\s\S]*?)}\s*from\s*["'][^"']+["']/g);

  for (const match of matches) {
    const rawList = match[1];
    const entries = rawList
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    for (const entry of entries) {
      const aliasMatch = entry.match(
        /^([A-Za-z_$][A-Za-z0-9_$]*)\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)$/
      );
      if (aliasMatch) {
        bindings.push({ imported: aliasMatch[1], local: aliasMatch[2] });
        continue;
      }
      const plainMatch = entry.match(/^([A-Za-z_$][A-Za-z0-9_$]*)$/);
      if (plainMatch) {
        bindings.push({ imported: plainMatch[1], local: plainMatch[1] });
      }
    }
  }

  return bindings;
};

const extractDefaultObjectLiteral = (source: string): string | null => {
  const trimmed = source.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("{")) {
    return extractBalancedSegment(trimmed, 0, "{", "}");
  }

  const candidateStarts: number[] = [];
  const exportDefaultIndex = trimmed.indexOf("export default");
  if (exportDefaultIndex >= 0) {
    const exportDefaultBrace = trimmed.indexOf("{", exportDefaultIndex);
    if (exportDefaultBrace >= 0) {
      candidateStarts.push(exportDefaultBrace);
    }
  }

  const assignmentMatches = trimmed.matchAll(/=\s*\{/g);
  for (const match of assignmentMatches) {
    if (typeof match.index === "number") {
      candidateStarts.push(match.index + match[0].lastIndexOf("{"));
    }
  }

  const firstBrace = trimmed.indexOf("{");
  if (firstBrace >= 0) {
    candidateStarts.push(firstBrace);
  }

  for (const start of candidateStarts) {
    const extracted = extractBalancedSegment(trimmed, start, "{", "}");
    if (extracted) {
      return extracted;
    }
  }

  return null;
};

const resolveFallbackValue = (
  localName: string,
  importedName: string,
  fallbackRecord: Record<string, unknown>
): unknown => {
  if (importedName in fallbackRecord) {
    return fallbackRecord[importedName];
  }
  if (localName in fallbackRecord) {
    return fallbackRecord[localName];
  }
  const oldAliasMatch = localName.match(/^old([A-Z].*)$/);
  if (oldAliasMatch) {
    const normalized = oldAliasMatch[1][0].toLowerCase() + oldAliasMatch[1].slice(1);
    if (normalized in fallbackRecord) {
      return fallbackRecord[normalized];
    }
  }
  return {};
};

type ParseDefaultObjectFromSourceOptions = {
  fallbackRecord?: Record<string, unknown>;
};

export const parseDefaultObjectFromSource = (
  source: string,
  options?: ParseDefaultObjectFromSourceOptions
): Record<string, unknown> => {
  const objectLiteral = extractDefaultObjectLiteral(source);
  if (!objectLiteral) {
    throw new Error("Could not parse object literal from siteCopy.default.ts input.");
  }

  const fallbackRecord = isRecord(options?.fallbackRecord) ? options.fallbackRecord : {};
  const context: Record<string, unknown> = {};
  for (const binding of extractImportBindings(source)) {
    context[binding.local] = resolveFallbackValue(binding.local, binding.imported, fallbackRecord);
  }

  const evaluate = (scope: Record<string, unknown>): unknown => {
    const names = Object.keys(scope);
    const values = names.map((name) => scope[name]);
    return new Function(...names, `"use strict"; return (${objectLiteral});`)(...values);
  };

  let evaluated: unknown;
  let lastError: unknown = null;
  for (let index = 0; index < 20; index += 1) {
    try {
      evaluated = evaluate(context);
      break;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : "";
      const missingIdentifierMatch = message.match(/^([A-Za-z_$][A-Za-z0-9_$]*) is not defined$/);
      if (!missingIdentifierMatch) {
        break;
      }
      const missingIdentifier = missingIdentifierMatch[1];
      if (missingIdentifier in context) {
        break;
      }
      context[missingIdentifier] = resolveFallbackValue(
        missingIdentifier,
        missingIdentifier,
        fallbackRecord
      );
    }
  }

  if (evaluated === undefined && lastError) {
    throw new Error(
      `Failed to parse siteCopy.default.ts input: ${
        lastError instanceof Error ? lastError.message : "Invalid source."
      }`
    );
  }

  if (!isRecord(evaluated)) {
    throw new Error("siteCopy.default.ts must resolve to an object.");
  }

  return evaluated;
};
