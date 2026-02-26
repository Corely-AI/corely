import { Injectable } from "@nestjs/common";
import type {
  CashlessGatewayPort,
  CreateCashlessSessionInput,
  CreateCashlessSessionOutput,
  GetCashlessSessionStatusInput,
  GetCashlessSessionStatusOutput,
} from "../../../pos/application/ports/cashless-gateway.port";
import { IntegrationConnectionResolverService } from "../../application/services/integration-connection-resolver.service";
import { IntegrationProviderRegistryService } from "../../application/services/integration-provider-registry.service";

@Injectable()
export class IntegrationsCashlessGatewayService implements CashlessGatewayPort {
  constructor(
    private readonly resolver: IntegrationConnectionResolverService,
    private readonly providers: IntegrationProviderRegistryService
  ) {}

  async createSession(input: CreateCashlessSessionInput): Promise<CreateCashlessSessionOutput> {
    const kind = input.providerHint ?? "sumup";
    const resolved = await this.resolver.resolveActiveByKind(
      input.workspaceId,
      input.workspaceId,
      kind
    );
    const client = this.providers.getCashlessClient(resolved.connection, resolved.secret!);
    const session = await client.createSession({
      amountCents: input.amountCents,
      currency: input.currency,
      reference: input.reference,
    });

    return {
      providerKind: kind,
      providerRef: session.providerRef,
      status: session.status,
      action: session.action,
      raw: session.raw,
    };
  }

  async getStatus(input: GetCashlessSessionStatusInput): Promise<GetCashlessSessionStatusOutput> {
    const resolved = await this.resolver.resolveActiveByKind(
      input.workspaceId,
      input.workspaceId,
      input.providerKind
    );
    const client = this.providers.getCashlessClient(resolved.connection, resolved.secret!);
    const session = await client.getStatus(input.providerRef);

    return {
      status: session.status,
      action: session.action,
      raw: session.raw,
    };
  }

  async cancelSession(
    input: GetCashlessSessionStatusInput
  ): Promise<GetCashlessSessionStatusOutput> {
    const resolved = await this.resolver.resolveActiveByKind(
      input.workspaceId,
      input.workspaceId,
      input.providerKind
    );
    const client = this.providers.getCashlessClient(resolved.connection, resolved.secret!);

    if (!("cancelSession" in client) || typeof client.cancelSession !== "function") {
      return {
        status: "cancelled",
        action: { type: "none" },
      };
    }

    const session = await client.cancelSession(input.providerRef);
    return {
      status: session.status,
      action: session.action,
      raw: session.raw,
    };
  }
}
