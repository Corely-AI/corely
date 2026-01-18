// apps/web/vitest.config.ts
import path from "path";
import { defineConfig } from "file:///Users/hadoan/Documents/GitHub/Kerniflow/node_modules/.pnpm/vitest@2.1.9_@types+node@22.19.3_jsdom@24.1.3_lightningcss@1.30.2_msw@2.12.4_@types+nod_b324955969b98dc46165085f2ba83da1/node_modules/vitest/dist/config.js";
var __vite_injected_original_dirname = "/Users/hadoan/Documents/GitHub/Kerniflow/apps/web";
var vitest_config_default = defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src"),
      "@corely/api-client": path.resolve(__vite_injected_original_dirname, "../../packages/api-client/src"),
      "@corely/auth-client": path.resolve(__vite_injected_original_dirname, "../../packages/auth-client/src")
    }
  },
  test: {
    name: "web",
    environment: "jsdom",
    include: ["src/**/*.spec.ts", "src/**/*.spec.tsx"],
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      reporter: ["text", "json", "html"]
    }
  }
});
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiYXBwcy93ZWIvdml0ZXN0LmNvbmZpZy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy9oYWRvYW4vRG9jdW1lbnRzL0dpdEh1Yi9LZXJuaWZsb3cvYXBwcy93ZWJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9oYWRvYW4vRG9jdW1lbnRzL0dpdEh1Yi9LZXJuaWZsb3cvYXBwcy93ZWIvdml0ZXN0LmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvaGFkb2FuL0RvY3VtZW50cy9HaXRIdWIvS2VybmlmbG93L2FwcHMvd2ViL3ZpdGVzdC5jb25maWcudHNcIjtpbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVzdC9jb25maWdcIjtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcbiAgICAgIFwiQGNvcmVseS9hcGktY2xpZW50XCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi4vLi4vcGFja2FnZXMvYXBpLWNsaWVudC9zcmNcIiksXG4gICAgICBcIkBjb3JlbHkvYXV0aC1jbGllbnRcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuLi8uLi9wYWNrYWdlcy9hdXRoLWNsaWVudC9zcmNcIiksXG4gICAgfSxcbiAgfSxcbiAgdGVzdDoge1xuICAgIG5hbWU6IFwid2ViXCIsXG4gICAgZW52aXJvbm1lbnQ6IFwianNkb21cIixcbiAgICBpbmNsdWRlOiBbXCJzcmMvKiovKi5zcGVjLnRzXCIsIFwic3JjLyoqLyouc3BlYy50c3hcIl0sXG4gICAgc2V0dXBGaWxlczogW1wiLi9zcmMvdGVzdC9zZXR1cC50c1wiXSxcbiAgICBjb3ZlcmFnZToge1xuICAgICAgcmVwb3J0ZXI6IFtcInRleHRcIiwgXCJqc29uXCIsIFwiaHRtbFwiXSxcbiAgICB9LFxuICB9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXlVLE9BQU8sVUFBVTtBQUMxVixTQUFTLG9CQUFvQjtBQUQ3QixJQUFNLG1DQUFtQztBQUd6QyxJQUFPLHdCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsTUFDcEMsc0JBQXNCLEtBQUssUUFBUSxrQ0FBVywrQkFBK0I7QUFBQSxNQUM3RSx1QkFBdUIsS0FBSyxRQUFRLGtDQUFXLGdDQUFnQztBQUFBLElBQ2pGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsTUFBTTtBQUFBLElBQ0osTUFBTTtBQUFBLElBQ04sYUFBYTtBQUFBLElBQ2IsU0FBUyxDQUFDLG9CQUFvQixtQkFBbUI7QUFBQSxJQUNqRCxZQUFZLENBQUMscUJBQXFCO0FBQUEsSUFDbEMsVUFBVTtBQUFBLE1BQ1IsVUFBVSxDQUFDLFFBQVEsUUFBUSxNQUFNO0FBQUEsSUFDbkM7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
