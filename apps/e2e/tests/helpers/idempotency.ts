import type { TestInfo } from "@playwright/test";

const sanitize = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/gu, "-");

export function idempotencyKey(testInfo: TestInfo, suffix: string): string {
  const testPath = testInfo.titlePath.join("-");
  const raw = `${sanitize(testPath)}-${sanitize(suffix)}-retry-${testInfo.retry}`;
  return `e2e-cash-${raw}`.slice(0, 180);
}
