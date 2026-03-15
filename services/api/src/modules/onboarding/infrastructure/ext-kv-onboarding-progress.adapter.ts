import { Inject, Injectable } from "@nestjs/common";
import { EXT_KV_PORT, type ExtKvPort } from "@corely/data";
import type { OnboardingProgress } from "@corely/contracts";
import type { OnboardingProgressPort } from "../application/ports/onboarding.ports";

const MODULE_ID = "onboarding";
const SCOPE = "workspace";

/**
 * Persists onboarding progress in the Tier-2 extension storage (ext.kv).
 * No Prisma model required; zero migration needed.
 *
 * Key structure: `journey:{journeyKey}:{workspaceId}`
 */
@Injectable()
export class ExtKvOnboardingProgressAdapter implements OnboardingProgressPort {
  constructor(
    @Inject(EXT_KV_PORT)
    private readonly kv: ExtKvPort
  ) {}

  private buildKey(journeyKey: string, workspaceId: string): string {
    return `journey:${journeyKey}:${workspaceId}`;
  }

  async get(
    tenantId: string,
    workspaceId: string,
    journeyKey: string
  ): Promise<OnboardingProgress | null> {
    const entry = await this.kv.get({
      tenantId,
      moduleId: MODULE_ID,
      scope: SCOPE,
      key: this.buildKey(journeyKey, workspaceId),
    });
    if (!entry) {
      return null;
    }
    return entry.value as OnboardingProgress;
  }

  async upsert(tenantId: string, progress: OnboardingProgress): Promise<void> {
    await this.kv.set({
      tenantId,
      moduleId: MODULE_ID,
      scope: SCOPE,
      key: this.buildKey(progress.journeyKey, progress.workspaceId),
      value: progress as unknown as Record<string, unknown>,
    });
  }
}
