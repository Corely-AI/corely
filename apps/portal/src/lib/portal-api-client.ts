import { request, type RequestOptions } from "@corely/api-client";
import { buildPortalApiUrl } from "./api-config";

export type PortalApiRequestOptions = Omit<RequestOptions, "url"> & {
  url: string;
};

export function portalApiRequest<T = unknown>(opts: PortalApiRequestOptions): Promise<T> {
  return request<T>({
    ...opts,
    url: buildPortalApiUrl(opts.url),
  });
}
