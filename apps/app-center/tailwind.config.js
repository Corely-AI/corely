import preset from "@corely/tailwind-preset";
export default {
  presets: [preset],
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
    "../../packages/web-shared/src/session/**/*.{ts,tsx}",
  ],
};
