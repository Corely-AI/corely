import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createBaseViteConfig } from "@corely/vite-config";

export default defineConfig(() => {
  const baseConfig = createBaseViteConfig({
    port: 8083,
    plugins: [react()],
    aliases: {
      "@": path.resolve(__dirname, "./src"),
      "@corely/api-client": path.resolve(__dirname, "../../packages/api-client/src"),
      "@corely/contracts": path.resolve(__dirname, "../../packages/contracts/src"),
      "@corely/ui": path.resolve(__dirname, "../../packages/ui/src"),
    },
    watchWorkspacePackages: ["@corely/*"],
    apiProxy: {
      target: "http://localhost:3000",
    },
  });

  return baseConfig;
});
