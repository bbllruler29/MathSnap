import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F6F7F4",
        ink: "#1B1E2B",
        "study-teal": "#0E7C7B",
        highlighter: "#F2A93B",
        "grid-line": "#D7DEE8",
        "red-pen": "#C1483D",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-figtree)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      borderRadius: {
        xl: "12px",
      },
      maxWidth: {
        reading: "42rem",
      },
    },
  },
  plugins: [],
};

export default config;
