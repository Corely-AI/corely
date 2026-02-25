import type { SyncTransport, CommandResult, OutboxCommand } from "@corely/offline-core";
import type {
  CashEntryType,
  CreateCheckInEventInput,
  CreateLoyaltyEarnEntryInput,
  OpenShiftInput,
  CloseShiftInput,
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
};

export class PosSyncTransport implements SyncTransport {
  constructor(private readonly deps: TransportDeps) {}

  async executeCommand(command: OutboxCommand): Promise<CommandResult> {
    try {
      switch (command.type) {
        case PosCommandTypes.SaleFinalize: {
          const payload = command.payload as SyncPosSaleInput;
          const output = await this.deps.apiClient.syncPosSale(payload);
          if (!output.ok) {
            if (output.code?.toUpperCase().includes("CONFLICT")) {
              return {
                status: "CONFLICT",
                conflict: {
                  message: output.message ?? "Sale conflict",
                  serverState: {
                    server: output.details,
                    client: payload,
                  },
                },
              };
            }
            return {
              status: "FATAL_ERROR",
              error: output.message ?? output.code ?? "Sale sync rejected",
            };
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
          return { status: "OK" };
        }
        case PosCommandTypes.ShiftOpen: {
          const payload = command.payload as OpenShiftInput;
          await this.deps.apiClient.openShift(payload);
          return { status: "OK" };
        }
        case PosCommandTypes.ShiftClose: {
          const payload = command.payload as CloseShiftInput;
          await this.deps.apiClient.closeShift(payload);
          return { status: "OK" };
        }
        case PosCommandTypes.ShiftCashEvent: {
          const payload = command.payload as ShiftCashEventCommandPayload;
          await this.deps.apiClient.createCashEntry({
            tenantId: command.workspaceId,
            registerId: payload.registerId,
            type: toCashEntryType(payload.eventType),
            amountCents: payload.amountCents,
            sourceType: CashEntrySourceType.MANUAL,
            description:
              payload.reason ??
              (payload.eventType === "PAID_IN" ? "POS shift paid-in" : "POS shift paid-out"),
            referenceId: payload.eventId,
            businessDate: payload.occurredAt.slice(0, 10),
          });

          if (this.deps.posLocalService) {
            await this.deps.posLocalService.markShiftCashEventSynced(payload.eventId);
          }
          return { status: "OK" };
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
          return { status: "OK" };
        }
        case EngagementCommandTypes.CreateLoyaltyEarn: {
          const payload = command.payload as CreateLoyaltyEarnEntryInput;
          await this.deps.apiClient.createLoyaltyEarn(payload, command.idempotencyKey);
          return { status: "OK" };
        }
        default:
          return { status: "FATAL_ERROR", error: "Unknown command type" };
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
      if (command.type === EngagementCommandTypes.CreateCheckIn && this.deps.engagementService) {
        const payload = command.payload as CreateCheckInEventInput;
        await this.deps.engagementService.markCheckInFailed(
          payload.checkInEventId,
          error instanceof Error ? error.message : "Sync failed"
        );
      }
      if (error instanceof HttpError) {
        if (error.status === 409) {
          return {
            status: "CONFLICT",
            conflict: {
              message: "Conflict from server",
              serverState: error.body,
            },
          };
        }
        if (error.status === 429) {
          return { status: "RETRYABLE_ERROR", error: error.body };
        }
        if (error.status && error.status >= 500) {
          return { status: "RETRYABLE_ERROR", error: error.body };
        }
        if (error.status === null) {
          return { status: "RETRYABLE_ERROR", error: error.body };
        }
        return { status: "FATAL_ERROR", error: error.body };
      }
      return { status: "RETRYABLE_ERROR", error: error instanceof Error ? error.message : error };
    }
  }
}

function toCashEntryType(eventType: ShiftCashEventType): CashEntryType {
  return eventType === "PAID_IN" ? "IN" : "OUT";
}
