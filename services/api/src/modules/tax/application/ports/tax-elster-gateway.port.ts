import type {
  TaxElsterGatewayConnectionStatus,
  TaxElsterGatewayRequest,
  TaxElsterGatewayResult,
} from "@corely/contracts";

export const TAX_ELSTER_GATEWAY_PORT = Symbol("TAX_ELSTER_GATEWAY_PORT");

export abstract class TaxElsterGatewayPort {
  abstract getConnectionStatus(): TaxElsterGatewayConnectionStatus;

  abstract execute(request: TaxElsterGatewayRequest): Promise<TaxElsterGatewayResult>;
}
