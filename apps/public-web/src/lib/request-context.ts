import { headers } from "next/headers";

export const getRequestContext = () => {
  const headerStore = headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "https";
  return { host, protocol };
};
