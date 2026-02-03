import type { Config } from "tailwindcss";
import preset from "@corely/tailwind-preset";
import typography from "@tailwindcss/typography";

export default {
  presets: [preset],
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    extend: {},
  },
  plugins: [typography],
} satisfies Config;
