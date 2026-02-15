import { SequenceAggregate } from "../../domain/sequence.aggregate";

export const SEQUENCE_REPO_PORT = Symbol("SEQUENCE_REPO_PORT");

export interface SequenceRepoPort {
  findById(tenantId: string, id: string): Promise<SequenceAggregate | null>;
  create(tenantId: string, aggregate: SequenceAggregate): Promise<void>;
  list(tenantId: string): Promise<SequenceAggregate[]>;
}
