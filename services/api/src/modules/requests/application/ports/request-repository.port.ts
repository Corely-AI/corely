import type { OperationalRequestKind, OperationalRequestRoute } from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";
import type { OperationalRequestRecord } from "../request-record";

export type RequestScope = { tenantId: string; workspaceId: string };
export type RequestReplay = { fingerprint: string; record: OperationalRequestRecord };
export type RouteReplay = { fingerprint: string; route: OperationalRequestRoute };

export abstract class OperationalRequestRepository {
  abstract transaction<T>(
    scope: RequestScope,
    work: (tx: TransactionContext) => Promise<T>
  ): Promise<T>;
  abstract list(scope: RequestScope, requesterUserId: string): Promise<OperationalRequestRecord[]>;
  abstract get(
    scope: RequestScope,
    id: string,
    tx?: TransactionContext
  ): Promise<OperationalRequestRecord | null>;
  abstract save(
    scope: RequestScope,
    record: OperationalRequestRecord,
    tx: TransactionContext
  ): Promise<void>;
  abstract replay(
    scope: RequestScope,
    key: string,
    tx: TransactionContext
  ): Promise<RequestReplay | null>;
  abstract saveReplay(
    scope: RequestScope,
    key: string,
    replay: RequestReplay,
    tx: TransactionContext
  ): Promise<void>;
  abstract routeReplay(
    scope: RequestScope,
    key: string,
    tx: TransactionContext
  ): Promise<RouteReplay | null>;
  abstract saveRouteReplay(
    scope: RequestScope,
    key: string,
    replay: RouteReplay,
    tx: TransactionContext
  ): Promise<void>;
  abstract route(
    scope: RequestScope,
    kind: OperationalRequestKind,
    tx?: TransactionContext
  ): Promise<string | null>;
  abstract saveRoute(
    scope: RequestScope,
    kind: OperationalRequestKind,
    policyId: string,
    tx: TransactionContext
  ): Promise<void>;
}
