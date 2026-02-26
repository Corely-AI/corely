import { Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  NoopLogger,
  RequireTenant,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  ValidationError,
} from "@corely/kernel";
import type {
  TestIntegrationConnectionInput,
  TestIntegrationConnectionOutput,
} from "@corely/contracts";
import { IntegrationConnectionResolverService } from "../services/integration-connection-resolver.service";
import { IntegrationProviderRegistryService } from "../services/integration-provider-registry.service";

@RequireTenant()
@Injectable()
export class TestIntegrationConnectionUseCase extends BaseUseCase<
  TestIntegrationConnectionInput,
  TestIntegrationConnectionOutput
> {
  constructor(
    private readonly resolver: IntegrationConnectionResolverService,
    private readonly providers: IntegrationProviderRegistryService
  ) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: TestIntegrationConnectionInput,
    ctx: UseCaseContext
  ): Promise<Result<TestIntegrationConnectionOutput, UseCaseError>> {
    const resolved = await this.resolver.resolveById(ctx.tenantId!, input.id);
    const { connection, secret } = resolved;
    const kind = connection.toObject().kind;

    if (kind === "sumup" || kind === "adyen") {
      if (!secret) {
        throw new ValidationError("Connection secret is required");
      }
      this.providers.getCashlessClient(connection, secret);
      return ok({ ok: true });
    }

    if (kind === "microsoft_graph_mail" || kind === "google_gmail") {
      if (!secret) {
        throw new ValidationError("Connection secret is required");
      }
      this.providers.getMailClient(connection);
      this.providers.getOauthAccessToken(secret);
      return ok({ ok: true });
    }

    return ok({
      ok: false,
      code: "Integrations:ProviderUnsupported",
      detail: "Unsupported provider",
    });
  }
}
