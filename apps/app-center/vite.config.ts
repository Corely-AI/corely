import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@corely/contracts": fileURLToPath(new URL("../../packages/contracts/src", import.meta.url)),
      "@corely/ui": fileURLToPath(new URL("../../packages/ui/src", import.meta.url)),
      "@corely/web-shared": fileURLToPath(
        new URL("../../packages/web-shared/src", import.meta.url)
      ),
    },
  },
  // Same-origin session/BFF routing is supplied by the trusted focused-dev gateway.
  // Production routing/cutover remains under SURF-19/SURF-24.
  build: { sourcemap: false },
});
