import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: "#09070f", 900: "#0f0c1a", 800: "#161228", 700: "#201a38", 600: "#2b2447" },
        line: "#251f3e",
        fog: "#eceaf8",
        mute: "#8e88aa",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
    },
  },
} satisfies Config;
