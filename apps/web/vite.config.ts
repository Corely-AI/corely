import type { IncomingMessage } from "http";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createBaseViteConfig } from "@corely/vite-config";

// https://vitejs.dev/config/
const getFirstHostLabel = (value: string | undefined): string => {
  if (!value) {
    return "";
  }

  return value.split(",")[0]?.trim().replace(/:\d+$/, "").split(".")[0]?.toLowerCase() ?? "";
};

const resolveSurfaceProxyHeaders = (
  hostHeader: string | undefined,
  env: Record<string, string>
): { declaredSurface: string; proxyKey: string } | null => {
  const firstLabel = getFirstHostLabel(hostHeader);

  if (firstLabel === "app") {
    const proxyKey = env.CORELY_PROXY_KEY_APP?.trim();
    return proxyKey ? { declaredSurface: "app", proxyKey } : null;
  }

  if (firstLabel === "pos" || firstLabel === "restaurant") {
    const proxyKey = env.CORELY_PROXY_KEY_POS?.trim();
    return proxyKey ? { declaredSurface: "pos", proxyKey } : null;
  }

  if (firstLabel === "crm") {
    const proxyKey = env.CORELY_PROXY_KEY_CRM?.trim();
    return proxyKey ? { declaredSurface: "crm", proxyKey } : null;
  }

  return null;
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, "../.."), "");
  const baseConfig = createBaseViteConfig({
    port: 8080,
    plugins: [
      react(), // tailwindcss() is handled by postcss.config.js
    ],
    aliases: {
      "@/lib": path.resolve(__dirname, "../../packages/web-shared/src/lib"),
      "@/shared": path.resolve(__dirname, "../../packages/web-shared/src/shared"),
      "@/offline": path.resolve(__dirname, "../../packages/web-shared/src/offline"),
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

  const apiProxy = {
    target: "http://localhost:3000",
    changeOrigin: true,
    xfwd: true,
    rewrite: (requestPath: string) => requestPath.replace(/^\/api/, ""),
    configure: (proxy: {
      on: (event: "proxyReq", handler: (proxyReq: any, req: IncomingMessage) => void) => void;
    }) => {
      proxy.on("proxyReq", (proxyReq, req) => {
        const headers = resolveSurfaceProxyHeaders(req.headers.host, env);
        if (!headers) {
          return;
        }

        proxyReq.setHeader("x-corely-proxy-key", headers.proxyKey);
        proxyReq.setHeader("x-corely-surface", headers.declaredSurface);
      });
    },
  };

  return {
    ...baseConfig,
    server: {
      ...baseConfig.server,
      proxy: {
        ...(baseConfig.server?.proxy ?? {}),
        "/api": apiProxy,
      },
    },
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
