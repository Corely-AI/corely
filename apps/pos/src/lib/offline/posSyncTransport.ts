import type { SyncTransport, CommandResult, OutboxCommand } from "@corely/offline-core";
import type {
  CashEntryType,
  OpenRestaurantTableInput,
  OpenRestaurantTableOutput,
  CreateCheckInEventInput,
  CreateLoyaltyEarnEntryInput,
  OpenShiftInput,
  CloseShiftInput,
  PutRestaurantDraftOrderInput,
  PutRestaurantDraftOrderOutput,
  SendRestaurantOrderToKitchenInput,
  SendRestaurantOrderToKitchenOutput,
  SyncPosSaleInput,
} from "@corely/contracts";
import { CashEntrySourceType } from "@corely/contracts";
import { HttpError } from "@corely/api-client";
import { EngagementCommandTypes } from "@/offline/engagementOutbox";
import {
  PosCommandTypes,
  type ShiftCashEventCommandPayload,
  type ShiftCashEventType,
} from "@/offline/posOutbox";
import type { PosApiClient } from "@/lib/pos-api-client";
import type { EngagementService } from "@/services/engagementService";
import type { PosLocalService } from "@/services/posLocalService";

type TransportDeps = {
  apiClient: PosApiClient;
  engagementService?: EngagementService | null;
  posLocalService?: PosLocalService | null;
  onCommandSyncStart?: (command: OutboxCommand) => void | Promise<void>;
  onCommandSyncResult?: (
    command: OutboxCommand,
    result: CommandResult,
    meta?: { error?: unknown }
  ) => void | Promise<void>;
};

export class PosSyncTransport implements SyncTransport {
  constructor(private readonly deps: TransportDeps) {}

  async executeCommand(command: OutboxCommand): Promise<CommandResult> {
    await this.deps.onCommandSyncStart?.(command);
    try {
      let result: CommandResult;
      switch (command.type) {
        case PosCommandTypes.SaleFinalize: {
          const payload = command.payload as SyncPosSaleInput;
          const output = await this.deps.apiClient.syncPosSale(payload);
          if (!output.ok) {
            if (output.code?.toUpperCase().includes("CONFLICT")) {
              result = {
                status: "CONFLICT",
                conflict: {
                  message: output.message ?? "Sale conflict",
                  serverState: {
                    server: output.details,
                    client: payload,
                  },
                },
              };
              await this.deps.onCommandSyncResult?.(command, result);
              return result;
            }
            result = {
              status: "FATAL_ERROR",
              error: output.message ?? output.code ?? "Sale sync rejected",
            };
            await this.deps.onCommandSyncResult?.(command, result);
            return result;
          }

          if (this.deps.posLocalService) {
            const syncResult: {
              serverInvoiceId?: string;
              serverPaymentId?: string;
            } = {};
            if (output.serverInvoiceId) {
              syncResult.serverInvoiceId = output.serverInvoiceId;
            }
            if (output.serverPaymentId) {
              syncResult.serverPaymentId = output.serverPaymentId;
            }
            await this.deps.posLocalService.markSaleSynced(payload.posSaleId, syncResult);
          }
          result = { status: "OK" };
          await this.deps.onCommandSyncResult?.(command, result);
          return result;
        }
        case PosCommandTypes.ShiftOpen: {
          const payload = command.payload as OpenShiftInput;
          await this.deps.apiClient.openShift(payload);
          result = { status: "OK" };
          await this.deps.onCommandSyncResult?.(command, result);
          return result;
        }
        case PosCommandTypes.ShiftClose: {
          const payload = command.payload as CloseShiftInput;
          await this.deps.apiClient.closeShift(payload);
          result = { status: "OK" };
          await this.deps.onCommandSyncResult?.(command, result);
          return result;
        }
        case PosCommandTypes.ShiftCashEvent: {
          const payload = command.payload as ShiftCashEventCommandPayload;
          await this.deps.apiClient.createCashEntry({
            tenantId: command.workspaceId,
            registerId: payload.registerId,
            type: toCashEntryType(payload.eventType),
            amountCents: payload.amountCents,
            source: CashEntrySourceType.MANUAL,
            sourceType: CashEntrySourceType.MANUAL,
            description:
              payload.reason ??
              (payload.eventType === "PAID_IN" ? "POS shift paid-in" : "POS shift paid-out"),
            paymentMethod: "CASH",
            currency: "EUR",
            referenceId: payload.eventId,
            businessDate: payload.occurredAt.slice(0, 10),
          });

          if (this.deps.posLocalService) {
            await this.deps.posLocalService.markShiftCashEventSynced(payload.eventId);
          }
          result = { status: "OK" };
          await this.deps.onCommandSyncResult?.(command, result);
          return result;
        }
        case PosCommandTypes.RestaurantTableOpen: {
          const payload = command.payload as OpenRestaurantTableInput;
          const output = (await this.deps.apiClient.openRestaurantTable(
            payload
          )) as OpenRestaurantTableOutput;
          if (this.deps.posLocalService) {
            await this.deps.posLocalService.markRestaurantOrderSynced(payload.orderId, {
              session: output.session,
              order: output.order,
            });
          }
          result = { status: "OK" };
          await this.deps.onCommandSyncResult?.(command, result);
          return result;
        }
        case PosCommandTypes.RestaurantDraftReplace: {
          const payload = command.payload as PutRestaurantDraftOrderInput;
          const output = (await this.deps.apiClient.putRestaurantDraftOrder(
            payload
          )) as PutRestaurantDraftOrderOutput;
          if (this.deps.posLocalService) {
            await this.deps.posLocalService.markRestaurantOrderSynced(payload.orderId, {
              order: output.order,
            });
          }
          result = { status: "OK" };
          await this.deps.onCommandSyncResult?.(command, result);
          return result;
        }
        case PosCommandTypes.RestaurantSendToKitchen: {
          const payload = command.payload as SendRestaurantOrderToKitchenInput;
          const output = (await this.deps.apiClient.sendRestaurantOrderToKitchen(
            payload
          )) as SendRestaurantOrderToKitchenOutput;
          if (this.deps.posLocalService) {
            await this.deps.posLocalService.markRestaurantOrderSynced(payload.orderId, {
              order: output.order,
            });
          }
          result = { status: "OK" };
          await this.deps.onCommandSyncResult?.(command, result);
          return result;
        }
        case EngagementCommandTypes.CreateCheckIn: {
          const payload = command.payload as CreateCheckInEventInput;
          const result = await this.deps.apiClient.createCheckIn(payload, command.idempotencyKey);
          if (this.deps.engagementService) {
            await this.deps.engagementService.markCheckInSynced(
              payload.checkInEventId,
              result.pointsAwarded ?? null
            );
          }
          const syncResult: CommandResult = { status: "OK" };
          await this.deps.onCommandSyncResult?.(command, syncResult);
          return syncResult;
        }
        case EngagementCommandTypes.CreateLoyaltyEarn: {
          const payload = command.payload as CreateLoyaltyEarnEntryInput;
          await this.deps.apiClient.createLoyaltyEarn(payload, command.idempotencyKey);
          result = { status: "OK" };
          await this.deps.onCommandSyncResult?.(command, result);
          return result;
        }
        default:
          result = { status: "FATAL_ERROR", error: "Unknown command type" };
          await this.deps.onCommandSyncResult?.(command, result);
          return result;
      }
    } catch (error) {
      if (command.type === PosCommandTypes.SaleFinalize && this.deps.posLocalService) {
        const payload = command.payload as SyncPosSaleInput;
        await this.deps.posLocalService.markSaleSyncFailure(
          payload.posSaleId,
          error instanceof Error ? error.message : "Sync failed"
        );
      }
      if (command.type === PosCommandTypes.ShiftCashEvent && this.deps.posLocalService) {
        const payload = command.payload as ShiftCashEventCommandPayload;
        await this.deps.posLocalService.markShiftCashEventFailed(
          payload.eventId,
          error instanceof Error ? error.message : "Sync failed"
        );
      }
      if (
        (command.type === PosCommandTypes.RestaurantTableOpen ||
          command.type === PosCommandTypes.RestaurantDraftReplace ||
          command.type === PosCommandTypes.RestaurantSendToKitchen) &&
        this.deps.posLocalService
      ) {
        const payload = command.payload as
          | OpenRestaurantTableInput
          | PutRestaurantDraftOrderInput
          | SendRestaurantOrderToKitchenInput;
        await this.deps.posLocalService.markRestaurantOrderSyncFailure(
          payload.orderId,
          error instanceof Error ? error.message : "Sync failed"
        );
      }
      if (command.type === EngagementCommandTypes.CreateCheckIn && this.deps.engagementService) {
        const payload = command.payload as CreateCheckInEventInput;
        await this.deps.engagementService.markCheckInFailed(
          payload.checkInEventId,
          error instanceof Error ? error.message : "Sync failed"
        );
      }
      if (error instanceof HttpError) {
        if (error.status === 409) {
          const result: CommandResult = {
            status: "CONFLICT",
            conflict: {
              message: "Conflict from server",
              serverState: error.body,
            },
          };
          await this.deps.onCommandSyncResult?.(command, result, { error });
          return result;
        }
        if (error.status === 429) {
          const result: CommandResult = { status: "RETRYABLE_ERROR", error: error.body };
          await this.deps.onCommandSyncResult?.(command, result, { error });
          return result;
        }
        if (error.status && error.status >= 500) {
          const result: CommandResult = { status: "RETRYABLE_ERROR", error: error.body };
          await this.deps.onCommandSyncResult?.(command, result, { error });
          return result;
        }
        if (error.status === null) {
          const result: CommandResult = { status: "RETRYABLE_ERROR", error: error.body };
          await this.deps.onCommandSyncResult?.(command, result, { error });
          return result;
        }
        const result: CommandResult = { status: "FATAL_ERROR", error: error.body };
        await this.deps.onCommandSyncResult?.(command, result, { error });
        return result;
      }
      const result: CommandResult = {
        status: "RETRYABLE_ERROR",
        error: error instanceof Error ? error.message : error,
      };
      await this.deps.onCommandSyncResult?.(command, result, { error });
      return result;
    }
  }
}

function toCashEntryType(eventType: ShiftCashEventType): CashEntryType {
  return eventType === "PAID_IN" ? "IN" : "OUT";
}
