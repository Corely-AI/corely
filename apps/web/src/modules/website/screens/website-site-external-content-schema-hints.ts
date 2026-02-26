import type {
  ExternalContentFieldHint,
  ExternalContentFieldHints,
} from "./website-site-external-content-generator";

type SchemaPathSegment = string | "[]";
type ParsedObjectEntry = {
  key: string;
  valueSource: string;
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

const parseObjectLiteralEntries = (objectLiteral: string): ParsedObjectEntry[] => {
  if (objectLiteral.length < 2) {
    return [];
  }

  const body = objectLiteral.slice(1, -1);
  const entries: ParsedObjectEntry[] = [];
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

    index += 1;
    consumeWhitespaceAndComments();
    const valueStart = index;
    consumeValueUntilComma();
    const valueSource = body.slice(valueStart, index).trim();
    entries.push({ key, valueSource });
    if (body[index] === ",") {
      index += 1;
    }
  }

  return entries;
};

const toHintPathKey = (path: SchemaPathSegment[]): string => path.join(".");

const parseHintFromDescription = (description: string): ExternalContentFieldHint | null => {
  const normalized = description
    .trim()
    .toLowerCase()
    .replace(/^editor:/, "")
    .replace(/^field:/, "");
  if (!normalized) {
    return null;
  }

  if (["file", "asset", "document"].includes(normalized)) {
    return { fieldKind: "fileId", isImageLike: false };
  }
  if (["image", "file:image", "asset:image"].includes(normalized)) {
    return { fieldKind: "fileId", isImageLike: true };
  }
  if (["file:list", "asset:list", "document:list", "file[]"].includes(normalized)) {
    return { fieldKind: "fileIdList", isImageLike: false };
  }
  if (["image:list", "file:image-list", "asset:image-list", "image[]"].includes(normalized)) {
    return { fieldKind: "fileIdList", isImageLike: true };
  }
  return null;
};

const extractDescriptionHint = (expression: string): ExternalContentFieldHint | null => {
  const descriptionMatch = expression.match(/\.describe\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/);
  if (!descriptionMatch) {
    return null;
  }
  return parseHintFromDescription(descriptionMatch[1]);
};

const walkSchemaExpression = (
  expression: string,
  path: SchemaPathSegment[],
  hints: ExternalContentFieldHints
) => {
  const descriptionHint = extractDescriptionHint(expression);
  if (descriptionHint && path.length > 0) {
    hints[toHintPathKey(path)] = descriptionHint;
  }

  const objectMatch = expression.match(
    /(?:^|[^A-Za-z0-9_$])(?:z|[A-Za-z_$][A-Za-z0-9_$]*)\.object\s*\(/
  );
  if (!objectMatch || typeof objectMatch.index !== "number") {
    return;
  }

  const matchStart = objectMatch.index + objectMatch[0].length - 1;
  const braceStart = expression.indexOf("{", matchStart);
  if (braceStart < 0) {
    return;
  }

  const objectLiteral = extractBalancedSegment(expression, braceStart, "{", "}");
  if (!objectLiteral) {
    return;
  }

  const isArrayItemObject = /\barray\s*\(/.test(expression.slice(0, objectMatch.index));
  const nestedPathBase = isArrayItemObject ? [...path, "[]"] : path;

  for (const entry of parseObjectLiteralEntries(objectLiteral)) {
    walkSchemaExpression(entry.valueSource, [...nestedPathBase, entry.key], hints);
  }
};

export const extractSchemaFieldHints = (source: string): ExternalContentFieldHints => {
  const hints: ExternalContentFieldHints = {};
  const directIndex = source.indexOf("z.object");
  const chainedMatch = source.match(/\.object\s*\(/);
  const schemaIndex = directIndex >= 0 ? directIndex : (chainedMatch?.index ?? -1);
  if (schemaIndex < 0) {
    return hints;
  }

  const schemaExpression = source.slice(schemaIndex);
  walkSchemaExpression(schemaExpression, [], hints);
  return hints;
};
