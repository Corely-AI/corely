import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath } from "node:url";
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@corely/contracts/identity/sso": fileURLToPath(
        new URL("../../packages/contracts/src/identity/sso.schema.ts", import.meta.url)
      ),
      "@corely/contracts": fileURLToPath(
        new URL("../../packages/contracts/src/index.ts", import.meta.url)
      ),
      "@corely/ui": fileURLToPath(new URL("../../packages/ui/src", import.meta.url)),
    },
  },
  // The upstream must authenticate this fixed origin with CORELY_SSO_PROXY_KEY.
  // Production routing is configured separately; never expose the proxy key in VITE_*.
  server: { proxy: { "/sso": { target: "http://127.0.0.1:3000", changeOrigin: false } } },
  build: { sourcemap: false },
});
