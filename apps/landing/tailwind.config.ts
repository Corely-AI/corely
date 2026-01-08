import type { Config } from "tailwindcss";
import preset from "@corely/tailwind-preset";

export default {
  presets: [preset],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    extend: {},
  },
} satisfies Config;
