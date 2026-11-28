import type { InlineConfig } from "vite";
import type { FocusedDevConfig } from "../../packages/config/src/focused-surfaces";
import { resolve } from "node:path";

export function focusedViteOptions(
  config: FocusedDevConfig,
  privateFiles: readonly string[]
): InlineConfig {
  return {
    define: Object.fromEntries(
      Object.entries(config.browser).map(([key, value]) => [
        `import.meta.env.${key}`,
        JSON.stringify(value),
      ])
    ),
    envPrefix: [],
    server: {
      fs: {
        strict: true,
        // Keep Vite's default secret-file rules and protect custom names too.
        // Escape glob syntax so paths such as Users/[name]/settings stay literal.
        deny: [
          ".env",
          ".env.*",
          "*.{crt,pem}",
          "**/.git/**",
          ...privateFiles.map((file) =>
            resolve(file)
              .replaceAll("\\", "/")
              .replace(/([*?[\]{}()!+@])/g, "\\$1")
          ),
        ],
      },
    },
  };
}
