import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createBaseViteConfig } from "@corely/vite-config";

export default defineConfig(() => {
  return createBaseViteConfig({
    port: 8091,
    plugins: [react()],
    aliases: {
      "@": path.resolve(__dirname, "./src"),
      "@corely/api-client": path.resolve(__dirname, "../../packages/api-client/src"),
      "@corely/contracts": path.resolve(__dirname, "../../packages/contracts/src"),
    },
    watchWorkspacePackages: ["@corely/*"],
    apiProxy: {
      target: "http://localhost:3000",
    },
  });
});
