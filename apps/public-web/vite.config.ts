import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createBaseViteConfig } from "@corely/vite-config";

export default defineConfig(() => {
  const baseConfig = createBaseViteConfig({
    port: 8082,
    plugins: [react()],
    aliases: {
      "@": path.resolve(__dirname, "./src"),
    },
  });

  return {
    ...baseConfig,
    publicDir: "assets/public",
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
            if (id.includes("lucide-react")) {
              return "icons";
            }

            return "vendor";
          },
        },
      },
    },
  };
});
