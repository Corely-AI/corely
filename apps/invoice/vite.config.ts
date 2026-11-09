import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath } from "node:url";
import tailwindcss from "tailwindcss";
import preset from "../../packages/tooling/tailwind-preset/index.js";
const resolve = (path: string) => fileURLToPath(new URL(path, import.meta.url));
export default defineConfig({
  root: resolve("./"),
  plugins: [react()],
  resolve: {
    alias: {
      "@corely/web-features": resolve("../../packages/web-features/src"),
      "@corely/web-shared": resolve("../../packages/web-shared/src"),
      "@corely/contracts": resolve("../../packages/contracts/src"),
      "@corely/ui": resolve("../../packages/ui/src"),
      "@corely/api-client": resolve("../../packages/api-client/src"),
      "@corely/auth-client": resolve("../../packages/auth-client/src"),
    },
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          presets: [preset],
          content: [
            resolve("src/**/*.tsx"),
            resolve("../../packages/web-features/src/modules/invoices/**/*.tsx"),
            resolve("../../packages/web-shared/src/**/*.tsx"),
            resolve("../../packages/ui/src/**/*.tsx"),
          ],
        }),
      ],
    },
  },
  server: { host: "127.0.0.1", port: 8096, strictPort: true },
  build: { sourcemap: false },
});
