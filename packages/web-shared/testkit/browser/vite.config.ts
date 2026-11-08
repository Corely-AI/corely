import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import tailwindcss from "tailwindcss";
import preset from "../../../tooling/tailwind-preset/index.js";
const resolve = (path: string) => fileURLToPath(new URL(path, import.meta.url));
export default defineConfig({
  root: resolve("./"),
  resolve: {
    alias: {
      "@corely/contracts": resolve("../../../contracts/src"),
      "@corely/ui": resolve("../../../ui/src"),
      "@corely/web-shared": resolve("../../src"),
    },
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          presets: [preset],
          content: [
            resolve("../../src/session/**/*.tsx"),
            resolve("../../../ui/src/button.tsx"),
            resolve("./main.tsx"),
          ],
        }),
      ],
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5186,
    strictPort: true,
    fs: { allow: [resolve("../../../../")] },
  },
});
