import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { createBaseViteConfig } from "@corely/vite-config";
import path from "node:path";
export default defineConfig(
  createBaseViteConfig({
    aliases: Object.fromEntries(
      [
        "web-features",
        "web-shared",
        "ui",
        "contracts",
        "auth-client",
        "api-client",
        "domain",
        "offline-core",
        "offline-web",
        "website-blocks",
      ].map((name) => ["@corely/" + name, path.resolve(__dirname, "../../packages", name, "src")])
    ),
    port: 5184,
    plugins: [react()],
    apiProxy: { target: "http://127.0.0.1:3000" },
  })
);
