import type { TransactionContext } from "@corely/kernel";

export const SIGNUP_APP_PROVISIONER = "platform-entitlements/signup-app-provisioner";

export interface SignupAppProvisioner {
  provisionSignupApps(tenantId: string, userId: string, tx: TransactionContext): Promise<void>;
}
