// Main exports for the config package
export {
  focusedBrowserEnvSchema,
  focusedDevEnvSchema,
  parseFocusedDevEnv,
  focusedSurfaceKeys,
  focusedSurfacePorts,
} from "./focused-surfaces";
export type { FocusedSurfaceKey, FocusedDevConfig } from "./focused-surfaces";
export { EnvModule } from "./env/env.module";
export { EnvService } from "./env/env.service";
export { loadEnv } from "./env/load-env";
export { validateEnv, envSchema, SECRET_ENV_KEYS } from "./env/env.schema";
export type { Env } from "./env/env.schema";
export type { EnvModuleOptions } from "./env/env.module";
