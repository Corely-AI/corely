import { PrismaExtKvAdapter, PrismaService } from "@corely/data";
import type { TransactionContext } from "@corely/kernel";
import { Injectable } from "@nestjs/common";
import { z } from "zod";
import {
  OperationalRequestRepository,
  type RequestReplay,
  type RouteReplay,
  type RequestScope,
} from "../application/ports/request-repository.port";
import {
  OperationalRequestRecordSchema,
  type OperationalRequestRecord,
} from "../application/request-record";
import { OperationalRequestRouteSchema, type OperationalRequestKind } from "@corely/contracts";

const keyFor = ({ tenantId, workspaceId }: RequestScope, namespace: string, key: string) => ({
  tenantId,
  moduleId: "requests",
  scope: JSON.stringify([workspaceId, namespace]),
  key,
});
const replaySchema = z.object({ fingerprint: z.string(), record: OperationalRequestRecordSchema });
const routeReplaySchema = z.object({
  fingerprint: z.string(),
  route: OperationalRequestRouteSchema,
});

@Injectable()
export class ExtOperationalRequestRepository extends OperationalRequestRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kv: PrismaExtKvAdapter
  ) {
    super();
  }

  transaction<T>(scope: RequestScope, work: (tx: TransactionContext) => Promise<T>) {
    return this.prisma.$transaction(
      async (client) => {
        const lock = JSON.stringify(["requests", scope.tenantId, scope.workspaceId]);
        await client.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lock}, 0))::text`;
        return work(client as unknown as TransactionContext);
      },
      { timeout: 15000 }
    );
  }

  async list(scope: RequestScope, requesterUserId: string) {
    const { tenantId, moduleId, scope: namespace } = keyFor(scope, "records", "");
    const rows = await this.prisma.extKv.findMany({
      where: {
        tenantId,
        moduleId,
        scope: namespace,
        value: { path: ["requesterUserId"], equals: requesterUserId },
      },
      select: { value: true },
    });
    return rows.map(
      ({ value }) => OperationalRequestRecordSchema.parse(value) as OperationalRequestRecord
    );
  }

  async get(scope: RequestScope, id: string, tx?: TransactionContext) {
    const row = await this.kv.get(keyFor(scope, "records", id), tx);
    return row
      ? (OperationalRequestRecordSchema.parse(row.value) as OperationalRequestRecord)
      : null;
  }

  async save(scope: RequestScope, record: OperationalRequestRecord, tx: TransactionContext) {
    await this.kv.set({ ...keyFor(scope, "records", record.id), value: record }, tx);
  }

  async replay(scope: RequestScope, key: string, tx: TransactionContext) {
    const row = await this.kv.get(keyFor(scope, "commands", key), tx);
    return row ? (replaySchema.parse(row.value) as RequestReplay) : null;
  }

  async saveReplay(
    scope: RequestScope,
    key: string,
    replay: RequestReplay,
    tx: TransactionContext
  ) {
    await this.kv.set({ ...keyFor(scope, "commands", key), value: replay }, tx);
  }

  async routeReplay(scope: RequestScope, key: string, tx: TransactionContext) {
    const row = await this.kv.get(keyFor(scope, "routing-commands", key), tx);
    return row ? (routeReplaySchema.parse(row.value) as RouteReplay) : null;
  }

  async saveRouteReplay(
    scope: RequestScope,
    key: string,
    replay: RouteReplay,
    tx: TransactionContext
  ) {
    await this.kv.set({ ...keyFor(scope, "routing-commands", key), value: replay }, tx);
  }

  async route(scope: RequestScope, kind: OperationalRequestKind, tx?: TransactionContext) {
    const row = await this.kv.get(keyFor(scope, "routing", kind), tx);
    return row ? z.string().parse(row.value) : null;
  }

  async saveRoute(
    scope: RequestScope,
    kind: OperationalRequestKind,
    policyId: string,
    tx: TransactionContext
  ) {
    await this.kv.set({ ...keyFor(scope, "routing", kind), value: policyId }, tx);
  }
}
