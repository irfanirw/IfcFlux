import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        panel: "#07162B",
        panelSoft: "#0C203D",
        line: "#113A64",
        accent: "#1E90FF",
        textMain: "#E7F1FF",
        textMuted: "#8BA4C4"
      },
      boxShadow: {
        panel: "0 0 0 1px rgba(39,89,144,0.25), inset 0 0 30px rgba(17,46,83,0.5)"
      }
    }
  },
  plugins: []
} satisfies Config;
