export const resolvePublicApiBaseUrl = () =>
  process.env.PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:3000";

export const buildPublicFileUrl = (fileId: string) =>
  `${resolvePublicApiBaseUrl().replace(/\/$/, "")}/public/documents/files/${fileId}`;
