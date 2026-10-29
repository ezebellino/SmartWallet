import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "#171918",
        panel: "#242826",
        panelSoft: "#303634",
        borderSoft: "#46504b",
        muted: "#b1b9b4",
        text: "#f5f6f2",
        emerald: "#a9dc75",
        cyan: "#7ed7cb",
        amber: "#f1c36a",
        rose: "#f28d8b"
      },
      boxShadow: {
        panel: "0 1px 3px rgba(0, 0, 0, 0.1)"
      },
      fontFamily: {
        sans: ["Segoe UI Variable Text", "Segoe UI", "Arial", "sans-serif"],
        display: ["Bahnschrift", "Arial Narrow", "Segoe UI", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;

