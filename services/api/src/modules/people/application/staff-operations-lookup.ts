import { Inject, Injectable } from "@nestjs/common";
import type { TransactionContext } from "@corely/kernel";
import {
  STAFF_REPOSITORY,
  type StaffRepositoryPort,
  type StaffScope,
} from "./ports/staff-repository.port";

export interface OperationalStaff {
  id: string;
  displayName: string;
  archivedAt: string | null;
}
@Injectable()
export class StaffOperationsLookup {
  constructor(@Inject(STAFF_REPOSITORY) private readonly repo: StaffRepositoryPort) {}
  lock(scope: StaffScope, tx: TransactionContext) {
    return this.repo.lock(scope, tx);
  }
  async list(scope: StaffScope, tx?: TransactionContext): Promise<OperationalStaff[]> {
    return (await this.repo.list(scope, tx)).map(({ id, displayName, archivedAt }) => ({
      id,
      displayName,
      archivedAt,
    }));
  }
  async get(
    scope: StaffScope,
    id: string,
    tx?: TransactionContext
  ): Promise<OperationalStaff | null> {
    const profile = await this.repo.get(scope, id, tx);
    return profile
      ? { id: profile.id, displayName: profile.displayName, archivedAt: profile.archivedAt }
      : null;
  }
  async forAccount(
    scope: StaffScope,
    userId: string,
    tx?: TransactionContext
  ): Promise<OperationalStaff | null> {
    const profile = (await this.repo.list(scope, tx)).find(
      (p) => p.accountId === userId && !p.archivedAt
    );
    return profile
      ? { id: profile.id, displayName: profile.displayName, archivedAt: profile.archivedAt }
      : null;
  }
}
