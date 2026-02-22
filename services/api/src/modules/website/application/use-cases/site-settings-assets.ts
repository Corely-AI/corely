import type { WebsiteSiteSettings } from "@corely/contracts";
import type { WebsitePublicFileUrlPort } from "../ports/public-file-url.port";

const PUBLIC_DOCUMENTS_FILE_URL_PATTERN =
  /^(?:https?:\/\/[^/]+)?(?:\/api)?\/public\/documents\/files\/([^/?#]+)/i;
const GCS_STORAGE_HOST_PATTERN = /(^|\.)storage\.googleapis\.com$/i;
const GCS_OBJECT_FILE_ID_PATTERN = /(?:^|\/)documents\/[^/]+\/files\/([^/]+)(?:\/|$)/i;

const normalizeNonEmptyString = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const extractFileIdFromPublicDocumentsUrl = (url: string | undefined): string | undefined => {
  if (!url) {
    return undefined;
  }

  const match = PUBLIC_DOCUMENTS_FILE_URL_PATTERN.exec(url);
  if (!match?.[1]) {
    return undefined;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
};

const extractFileIdFromSignedGcsUrl = (url: string | undefined): string | undefined => {
  if (!url) {
    return undefined;
  }

  try {
    const parsed = new URL(url);
    if (!GCS_STORAGE_HOST_PATTERN.test(parsed.hostname)) {
      return undefined;
    }

    const decodedPath = decodeURIComponent(parsed.pathname);
    const match = GCS_OBJECT_FILE_ID_PATTERN.exec(decodedPath);
    if (!match?.[1]) {
      return undefined;
    }

    return decodeURIComponent(match[1]);
  } catch {
    return undefined;
  }
};

const resolveFileUrl = async (
  fileId: string | undefined,
  currentUrl: string | undefined,
  publicFileUrlPort: WebsitePublicFileUrlPort
): Promise<string | undefined> => {
  const normalizedCurrentUrl = normalizeNonEmptyString(currentUrl);
  const inferredFileId =
    extractFileIdFromPublicDocumentsUrl(normalizedCurrentUrl) ??
    extractFileIdFromSignedGcsUrl(normalizedCurrentUrl);
  const effectiveFileId = normalizeNonEmptyString(fileId) ?? inferredFileId;

  if (normalizedCurrentUrl && !inferredFileId) {
    return normalizedCurrentUrl;
  }

  if (!effectiveFileId) {
    return normalizedCurrentUrl;
  }

  const resolvedUrl = normalizeNonEmptyString(
    await publicFileUrlPort.getPublicUrl(effectiveFileId)
  );
  return resolvedUrl;
};

export const withResolvedSiteAssetUrls = async (
  settings: WebsiteSiteSettings,
  publicFileUrlPort: WebsitePublicFileUrlPort
): Promise<WebsiteSiteSettings> => {
  const [logoUrl, faviconUrl] = await Promise.all([
    resolveFileUrl(settings.common.logo.fileId, settings.common.logo.url, publicFileUrlPort),
    resolveFileUrl(settings.common.favicon.fileId, settings.common.favicon.url, publicFileUrlPort),
  ]);

  return {
    ...settings,
    common: {
      ...settings.common,
      logo: {
        ...settings.common.logo,
        url: logoUrl,
      },
      favicon: {
        ...settings.common.favicon,
        url: faviconUrl,
      },
    },
  };
};
