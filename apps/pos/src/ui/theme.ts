export const posTheme = {
  colors: {
    primary: "#003399",
    primaryHover: "#002C85",
    primaryPressed: "#00246D",
    accent: "#FFCC00",
    background: "#F3F5FA",
    surface: "#FFFFFF",
    surfaceMuted: "#EEF1F8",
    text: "#111827",
    textMuted: "#556079",
    border: "#D9DEEA",
    danger: "#C0362C",
    warning: "#A86B00",
    success: "#0F8A4B",
    info: "#1C4ED8",
    // legacy aliases
    bg: "#F3F5FA",
    primaryMuted: "#E7EEFF",
  },
  typography: {
    title: {
      fontSize: 30,
      fontWeight: "800" as const,
      lineHeight: 36,
    },
    heading: {
      fontSize: 22,
      fontWeight: "800" as const,
      lineHeight: 28,
    },
    subheading: {
      fontSize: 18,
      fontWeight: "700" as const,
      lineHeight: 24,
    },
    body: {
      fontSize: 16,
      fontWeight: "500" as const,
      lineHeight: 22,
    },
    caption: {
      fontSize: 13,
      fontWeight: "500" as const,
      lineHeight: 18,
    },
  },
  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  radius: {
    md: 12,
    lg: 16,
    xl: 20,
    pill: 999,
    // legacy
    sm: 12,
  },
  elevation: {
    card: {
      shadowColor: "#0B1A3D",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 3,
    },
    elevated: {
      shadowColor: "#0B1A3D",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.14,
      shadowRadius: 18,
      elevation: 6,
    },
  },
  breakpoints: {
    phoneMax: 719,
    tabletMin: 720,
    wideMin: 1024,
  },
} as const;

export type PosTheme = typeof posTheme;
