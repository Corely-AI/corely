import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      // Watch workspace packages for changes
      ignored: ["!**/node_modules/@kerniflow/**"]
    }
  },
  optimizeDeps: {
    // Exclude workspace packages from pre-bundling so changes are picked up
    exclude: ["@kerniflow/contracts", "@kerniflow/domain"]
  }
});
