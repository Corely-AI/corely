import { createDirectoryClient } from "@corely/api-client";

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "/api" : "http://localhost:3000");

export const directoryClient = createDirectoryClient({ baseUrl: apiBaseUrl });
