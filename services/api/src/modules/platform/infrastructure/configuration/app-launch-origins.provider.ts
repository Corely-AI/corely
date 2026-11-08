import { EnvService } from "@corely/config";
import { AppLaunchOriginsSchema } from "@corely/contracts";
import { APP_LAUNCH_ORIGINS_TOKEN } from "../../application/ports/app-launch-origins.port";

export const appLaunchOriginsProvider = {
  provide: APP_LAUNCH_ORIGINS_TOKEN,
  useFactory: (env: EnvService) =>
    AppLaunchOriginsSchema.parse({
      invoice: env.getValue("CORELY_LAUNCH_INVOICE_ORIGIN"),
      hr: env.getValue("CORELY_LAUNCH_HR_ORIGIN"),
    }),
  inject: [EnvService],
};
