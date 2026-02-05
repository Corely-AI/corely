import { ValidationError } from "@corely/kernel";

export const normalizeHostname = (raw: string): string => {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) {
    throw new ValidationError("hostname is required", undefined, "Website:InvalidHostname");
  }

  if (trimmed.includes("//")) {
    throw new ValidationError(
      "hostname must not include a scheme",
      undefined,
      "Website:InvalidHostname"
    );
  }

  const withoutPath = trimmed.split("/")[0];
  const withoutPort = withoutPath.split(":")[0];

  if (!withoutPort) {
    throw new ValidationError(
      "hostname must be a valid hostname",
      undefined,
      "Website:InvalidHostname"
    );
  }

  if (
    !/^[a-z0-9.-]+$/.test(withoutPort) ||
    withoutPort.startsWith(".") ||
    withoutPort.endsWith(".") ||
    withoutPort.includes("..")
  ) {
    throw new ValidationError(
      "hostname must be a valid hostname",
      undefined,
      "Website:InvalidHostname"
    );
  }

  return withoutPort;
};

export const normalizePath = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "/";
  }

  const withoutQuery = trimmed.split("?")[0]?.split("#")[0] ?? trimmed;
  let path = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;

  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }

  if (path.includes("//")) {
    throw new ValidationError("path must not contain //", undefined, "Website:InvalidPath");
  }

  return path;
};

export const normalizeLocale = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new ValidationError("locale is required", undefined, "Website:InvalidLocale");
  }

  const match = trimmed.match(/^([a-z]{2})(?:-([a-zA-Z]{2}))?$/);
  if (!match) {
    throw new ValidationError(
      "locale must be in the form en or en-US",
      undefined,
      "Website:InvalidLocale"
    );
  }

  const language = match[1]!.toLowerCase();
  const region = match[2] ? match[2]!.toUpperCase() : undefined;
  return region ? `${language}-${region}` : language;
};

export const buildSeo = (input: {
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoImageFileId?: string | null;
}): { title?: string | null; description?: string | null; imageFileId?: string | null } => ({
  title: input.seoTitle ?? null,
  description: input.seoDescription ?? null,
  imageFileId: input.seoImageFileId ?? null,
});
