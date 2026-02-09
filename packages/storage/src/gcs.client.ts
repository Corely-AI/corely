import { Storage } from "@google-cloud/storage";

const tryParseServiceAccount = (value?: string) => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed.startsWith("{")) {
    return undefined;
  }
  try {
    return JSON.parse(trimmed) as { project_id?: string };
  } catch {
    return undefined;
  }
};

export const createGcsClient = (config?: { projectId?: string; keyFilename?: string }) => {
  const projectId = config?.projectId;
  const keyFilename = config?.keyFilename;
  const credentials = tryParseServiceAccount(keyFilename);
  const resolvedProjectId = projectId ?? credentials?.project_id;
  return new Storage({
    ...(resolvedProjectId ? { projectId: resolvedProjectId } : {}),
    ...(credentials ? { credentials } : {}),
    ...(!credentials && keyFilename ? { keyFilename } : {}),
  });
};

export type GcsClient = Storage;
