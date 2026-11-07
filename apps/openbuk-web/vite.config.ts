import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath, URL } from "node:url";
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: Object.fromEntries(
      ["contracts", "auth-client", "api-client"].map((p) => [
        `@corely/${p}`,
        fileURLToPath(new URL(`../../packages/${p}/src`, import.meta.url)),
      ])
    ),
  },
  server: {
    port: 8091,
    proxy: {
      "/api": {
        target: process.env.OPENBUK_API_PROXY_TARGET || "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
