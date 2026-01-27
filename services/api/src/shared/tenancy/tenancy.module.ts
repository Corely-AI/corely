import { DynamicModule, Module } from "@nestjs/common";
import { EnvService } from "@corely/config";
import {
  TENANT_RESOLVER_TOKEN,
  TENANT_ROUTING_SERVICE_TOKEN,
  type Edition,
} from "./tenancy.constants";
import { SingleTenantResolver } from "./single-tenant.resolver";
import type { TenantRoutingService } from "./tenant-routing.service";
import { loadEeTenancy } from "../../ee-loader";

@Module({})
export class TenancyModule {
  static forEdition(edition: Edition): DynamicModule {
    return {
      global: true,
      module: TenancyModule,
      providers: [
        {
          provide: TENANT_ROUTING_SERVICE_TOKEN,
          useFactory: async () => {
            if (edition === "ee") {
              try {
                const { InMemoryTenantRoutingService } = await loadEeTenancy();
                const RoutingCtor = InMemoryTenantRoutingService as new () => TenantRoutingService;
                return new RoutingCtor();
              } catch (error) {
                throw new Error(`EE routing service not available. ${(error as Error).message}`);
              }
            }
            // OSS: routing service unused (stub implementation)
            return {
              resolveSlug: async () => null,
              resolveHost: async () => null,
            } satisfies TenantRoutingService;
          },
        },
        {
          provide: TENANT_RESOLVER_TOKEN,
          useFactory: async (env: EnvService, routing: TenantRoutingService) => {
            if (edition === "ee") {
              try {
                const { MultiTenantResolver } = await loadEeTenancy();
                const ResolverCtor = MultiTenantResolver as new (routing: TenantRoutingService) => {
                  resolve: (...args: any[]) => Promise<any>;
                };
                return new ResolverCtor(routing);
              } catch (error) {
                throw new Error(`EE tenancy resolver not available. ${(error as Error).message}`);
              }
            }
            return new SingleTenantResolver(env.DEFAULT_TENANT_ID, env.DEFAULT_WORKSPACE_ID);
          },
          inject: [EnvService, TENANT_ROUTING_SERVICE_TOKEN],
        },
      ],
      exports: [TENANT_RESOLVER_TOKEN, TENANT_ROUTING_SERVICE_TOKEN],
    };
  }
}
