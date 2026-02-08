import type { Config } from "tailwindcss";
import preset from "@corely/tailwind-preset";

export default {
  presets: [preset],
  content: ["./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    extend: {},
  },
} satisfies Config;
