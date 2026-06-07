import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Shell ──
        shell: {
          DEFAULT: "#1B2A3B",
          hover:   "#243447",
        },
        // ── Page & Surface ──
        page:    "#F1F5F9",
        surface: "#FFFFFF",
        sidebar: "#F8FAFC",
        border:  "#E2E8F0",
        // ── Brand primary ──
        primary: {
          DEFAULT: "#2563EB",
          tonal:   "#EFF6FF",
          dark:    "#1D4ED8",
        },
        // ── Status badges (bg / text pairs) ──
        status: {
          draft:      { bg: "#F3F4F6", text: "#6B7280" },
          submitted:  { bg: "#FEF3C7", text: "#92400E" },
          approved:   { bg: "#DBEAFE", text: "#1E40AF" },
          posted:     { bg: "#D1FAE5", text: "#065F46" },
          closed:     { bg: "#E0E7FF", text: "#3730A3" },
          cancelled:  { bg: "#FEE2E2", text: "#991B1B" },
          in_transit: { bg: "#CFFAFE", text: "#155E75" },
        },
        // ── KPI card top-border colours ──
        kpi: {
          blue:   "#3B82F6",
          green:  "#10B981",
          amber:  "#F59E0B",
          purple: "#8B5CF6",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / .08), 0 1px 2px -1px rgb(0 0 0 / .06)",
        shell: "0 1px 4px 0 rgb(0 0 0 / .20)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
