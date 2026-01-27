export interface TenantRoutingService {
  resolveSlug(slug: string): Promise<string | null>;
  resolveHost(host: string): Promise<string | null>;
}
