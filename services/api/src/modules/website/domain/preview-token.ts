const PREVIEW_TOKEN_REGEX = /^[A-Za-z0-9._~-]{8,512}$/;

export const isWebsitePreviewTokenValid = (token: string | undefined): boolean =>
  Boolean(token && PREVIEW_TOKEN_REGEX.test(token));
