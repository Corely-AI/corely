import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createBaseViteConfig } from "@corely/vite-config";

// https://vitejs.dev/config/
export default defineConfig(() => {
  const baseConfig = createBaseViteConfig({
    port: 8086,
    plugins: [
      react(), // tailwindcss() is handled by postcss.config.js
    ],
    aliases: {
      "@": path.resolve(__dirname, "./src"),
      "@corely/api-client": path.resolve(__dirname, "../../packages/api-client/src"),
      "@corely/auth-client": path.resolve(__dirname, "../../packages/auth-client/src"),
      "@corely/contracts": path.resolve(__dirname, "../../packages/contracts/src"),
      "@corely/domain": path.resolve(__dirname, "../../packages/domain/src"),
      "@corely/offline-core": path.resolve(__dirname, "../../packages/offline-core/src"),
      "@corely/offline-web": path.resolve(__dirname, "../../packages/offline-web/src"),
      "@corely/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@corely/web-features": path.resolve(__dirname, "../../packages/web-features/src"),
      "@corely/web-shared": path.resolve(__dirname, "../../packages/web-shared/src"),
      "@corely/website-blocks": path.resolve(__dirname, "../../packages/website-blocks/src"),
    },
    excludeFromOptimizeDeps: ["@corely/contracts", "@corely/domain"],
    watchWorkspacePackages: ["@corely/*"],
    apiProxy: {
      target: "http://localhost:3000",
    },
  });

  return {
    ...baseConfig,
    build: {
      ...baseConfig.build,
      rollupOptions: {
        ...baseConfig.build?.rollupOptions,
        output: {
          ...baseConfig.build?.rollupOptions?.output,
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              return;
            }

            if (id.includes("react") || id.includes("scheduler")) {
              return "react";
            }
            if (id.includes("@radix-ui")) {
              return "radix";
            }
            if (id.includes("@tanstack")) {
              return "tanstack";
            }
            if (id.includes("lucide-react")) {
              return "icons";
            }
            if (id.includes("date-fns")) {
              return "date-fns";
            }
            if (id.includes("zod")) {
              return "zod";
            }

            return "vendor";
          },
        },
      },
    },
  };
});
