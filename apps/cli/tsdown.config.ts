import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  noExternal: [/^@corely\//, "zod"],
  external: ["@napi-rs/keyring", "open"],
});
