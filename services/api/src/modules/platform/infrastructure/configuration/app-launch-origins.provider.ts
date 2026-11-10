import { EnvService } from "@corely/config";
import { AppLaunchOriginsSchema } from "@corely/contracts";
import { APP_LAUNCH_ORIGINS_TOKEN } from "../../application/ports/app-launch-origins.port";

export const appLaunchOriginsProvider = {
  provide: APP_LAUNCH_ORIGINS_TOKEN,
  useFactory: (env: EnvService) => {
    const origins = AppLaunchOriginsSchema.parse({
      invoice: env.getValue("CORELY_LAUNCH_INVOICE_ORIGIN"),
      hr: env.getValue("CORELY_LAUNCH_HR_ORIGIN"),
      legacy: env.getValue("CORELY_LAUNCH_LEGACY_ORIGIN"),
    });
    if (
      env.NODE_ENV === "production" &&
      Object.values(origins).some((origin) => origin?.startsWith("http:"))
    ) {
      throw new Error("Focused app launch origins must use HTTPS when NODE_ENV=production");
    }
    return origins;
  },
  inject: [EnvService],
};
