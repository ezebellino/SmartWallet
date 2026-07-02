import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "#070b0f",
        panel: "#10161d",
        panelSoft: "#141b23",
        borderSoft: "#26313d",
        muted: "#94a3b8",
        text: "#f8fafc",
        emerald: "#16f2a4",
        cyan: "#38bdf8",
        amber: "#fbbf24",
        rose: "#fb7185"
      },
      boxShadow: {
        panel: "0 18px 70px rgba(0, 0, 0, 0.28)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Arial"]
      }
    }
  },
  plugins: []
};

export default config;

