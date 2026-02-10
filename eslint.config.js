import tseslint from "typescript-eslint";
import config from "@corely/eslint-config";

export default tseslint.config(
  {
    ignores: [
      "node_modules/",
      "dist/",
      "build/",
      "coverage/",
      ".next/",
      ".vercel/",
      "**/.vercel/**",
      "out/",
      ".git/",
      ".husky/",
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "pnpm-lock.yaml",
      "apps/e2e/playwright-report/",
      "apps/e2e/test-results/",
      "**/tsdown.config.ts",
      "**/*.test.ts",
      "**/*.spec.ts",
      "**/prisma.config.ts",
      "**/vitest.config.ts",
      "vitest.workspace.ts",
      "vitest.workspace.int.ts",
      "**/vite.config.ts",
      "**/tailwind.config.ts",
      "apps/public-web/next-env.d.ts",
      "apps/public-web/.next/**",
    ],
  },
  config.base,
  config.typescript,
  config.node,
  config.test,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/ee/**", "@corely/*-ee"],
              message:
                "EE packages must be loaded via runtime edition bridges (ee-loader.ts), not statically imported",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["./*.js", "./**/*.js", "../*.js", "../**/*.js"],
              message: "Use extensionless relative imports in TS/TSX (no .js).",
            },
            {
              group: ["**/ee/**", "@corely/*-ee"],
              message:
                "EE packages must be loaded via runtime edition bridges (ee-loader.ts), not statically imported",
            },
          ],
        },
      ],
    },
  },
  // Ban direct PrismaClient value imports in services — use PrismaService from @corely/data
  {
    files: ["services/**/*.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@prisma/client",
              importNames: ["PrismaClient"],
              message:
                "Use PrismaService from @corely/data instead. Registering PrismaClient directly as a NestJS provider causes initialization errors.",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  // Allow ee-loader files to import from EE packages
  {
    files: ["**/ee-loader.ts", "**/ee-loader.tsx"],
    rules: {
      "no-restricted-imports": "off",
    },
  }
);
