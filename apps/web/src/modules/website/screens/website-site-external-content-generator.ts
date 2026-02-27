export type ExternalContentPath = Array<string | number>;
export type ExternalContentFieldKind = "regular" | "fileId" | "fileIdList";
export type ExternalContentFieldHint = {
  fieldKind: Exclude<ExternalContentFieldKind, "regular">;
  isImageLike: boolean;
};
export type ExternalContentFieldHints = Record<string, ExternalContentFieldHint>;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const cloneJsonValue = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const toPathStateKey = (path: ExternalContentPath): string =>
  path.map((segment) => (typeof segment === "number" ? `[${segment}]` : segment)).join(".");

export const formatJson = (value: unknown): string => JSON.stringify(value, null, 2);

const FILE_ID_KEY_PATTERN = /fileid$/i;
const FILE_ID_LIST_KEY_PATTERN = /fileids$/i;
const IMAGE_KEY_HINT_PATTERN = /(image|images|logo|logos|avatar|photo|thumbnail|cover)/i;

const getLastStringSegment = (path: ExternalContentPath): string | null => {
  for (let index = path.length - 1; index >= 0; index -= 1) {
    const segment = path[index];
    if (typeof segment === "string") {
      return segment;
    }
  }
  return null;
};

export const getPathLabel = (path: ExternalContentPath): string =>
  path.map((segment) => (typeof segment === "number" ? `[${segment}]` : segment)).join(".");

export const isFileIdPath = (path: ExternalContentPath): boolean => {
  const key = getLastStringSegment(path);
  return key ? FILE_ID_KEY_PATTERN.test(key) : false;
};

export const isFileIdListPath = (path: ExternalContentPath): boolean => {
  const key = getLastStringSegment(path);
  return key ? FILE_ID_LIST_KEY_PATTERN.test(key) : false;
};

export const isImageLikePath = (path: ExternalContentPath): boolean => {
  const key = getLastStringSegment(path);
  return key ? IMAGE_KEY_HINT_PATTERN.test(key) : false;
};

export const toHintPathKey = (path: ExternalContentPath): string =>
  path.map((segment) => (typeof segment === "number" ? "[]" : segment)).join(".");

export const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
};

export const resolveExternalContentFieldKind = (
  path: ExternalContentPath,
  value: unknown,
  hints?: ExternalContentFieldHints
): ExternalContentFieldHint | null => {
  const hinted = hints?.[toHintPathKey(path)];
  if (hinted) {
    if (
      hinted.fieldKind === "fileIdList" &&
      (Array.isArray(value) || value === undefined || value === null)
    ) {
      return hinted;
    }
    if (
      hinted.fieldKind === "fileId" &&
      (typeof value === "string" || value === undefined || value === null)
    ) {
      return hinted;
    }
  }

  if (isFileIdListPath(path) && (Array.isArray(value) || value === undefined || value === null)) {
    return {
      fieldKind: "fileIdList",
      isImageLike: isImageLikePath(path),
    };
  }
  if (isFileIdPath(path) && (typeof value === "string" || value === undefined || value === null)) {
    return {
      fieldKind: "fileId",
      isImageLike: isImageLikePath(path),
    };
  }
  return null;
};

export const getValueAtPath = (value: unknown, path: ExternalContentPath): unknown => {
  let current = value;
  for (const segment of path) {
    if (typeof segment === "number") {
      if (!Array.isArray(current)) {
        return undefined;
      }
      current = current[segment];
      continue;
    }

    if (!isRecord(current)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
};

export const orderRootKeys = (
  value: Record<string, unknown>,
  keyOrder: string[]
): Record<string, unknown> => {
  if (keyOrder.length === 0) {
    return value;
  }

  const ordered: Record<string, unknown> = {};
  for (const key of keyOrder) {
    if (key in value) {
      ordered[key] = value[key];
    }
  }
  for (const key of Object.keys(value)) {
    if (!(key in ordered)) {
      ordered[key] = value[key];
    }
  }
  return ordered;
};

export const setValueAtPath = (
  value: unknown,
  path: ExternalContentPath,
  nextValue: unknown
): unknown => {
  if (path.length === 0) {
    return nextValue;
  }

  const [head, ...tail] = path;
  if (typeof head === "number") {
    const current = Array.isArray(value) ? [...value] : [];
    current[head] = tail.length === 0 ? nextValue : setValueAtPath(current[head], tail, nextValue);
    return current;
  }

  const current = isRecord(value) ? value : {};
  return {
    ...current,
    [head]: tail.length === 0 ? nextValue : setValueAtPath(current[head], tail, nextValue),
  };
};

export {
  extractSchemaRootKeys,
  parseDefaultObjectFromSource,
} from "./website-site-external-content-source-parser";
