import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "#0b1015",
        panel: "#141b20",
        panelSoft: "#1b242b",
        borderSoft: "#344047",
        muted: "#a3b2b9",
        text: "#f8fafc",
        emerald: "#48d9a2",
        cyan: "#75cdea",
        amber: "#fbbf24",
        rose: "#fb7185"
      },
      boxShadow: {
        panel: "0 3px 12px rgba(0, 0, 0, 0.12)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Arial"]
      }
    }
  },
  plugins: []
};

export default config;

