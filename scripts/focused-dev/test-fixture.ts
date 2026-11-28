import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

export const exampleEnv = parseEnv(readFileSync(".env.focused.example", "utf8"));
export const validEnv = {
  ...exampleEnv,
  CORELY_SSO_SECRET: "a1".repeat(32),
  CORELY_SSO_PROXY_KEY: "synthetic-test-proxy-key-not-used-in-deployments",
};
