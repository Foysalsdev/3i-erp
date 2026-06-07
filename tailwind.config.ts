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
        sap: {
          // ── NEW theme colors (SECTION A override) ──
          shell:          "#1B2A3B",   // dark navy shell bar
          shellHover:     "#243447",
          sidebar:        "#F8FAFC",   // soft white sidebar
          bg:             "#F1F5F9",   // page background (was #F5F6F7)
          surface:        "#FFFFFF",
          surfaceHover:   "#F8FAFC",
          overlay:        "#E2E8F0",

          // ── Primary blue (new) ──
          blue:           "#2563EB",   // was #0070F2
          blueDark:       "#1D4ED8",   // hover
          blueLight:      "#EFF6FF",   // tonal surface

          // ── Text ──
          text:           "#1E293B",
          textSecondary:  "#64748B",
          textDisabled:   "#94A3B8",
          textInverse:    "#FFFFFF",

          // ── Border & focus ──
          border:         "#E2E8F0",
          borderFocus:    "#2563EB",
          borderError:    "#EF4444",

          // ── Status (tonal system) ──
          success:        "#059669",
          successLight:   "#D1FAE5",
          warning:        "#D97706",
          warningLight:   "#FEF3C7",
          error:          "#DC2626",
          errorLight:     "#FEE2E2",
          info:           "#2563EB",
          infoLight:      "#EFF6FF",

          // ── Spacing aliases ──
          xs:    "4px",
          sm:    "8px",
          md:    "16px",
          lg:    "24px",
          xl:    "32px",
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
        sap:  ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },

      fontSize: {
        "sap-xs": ["11px", { lineHeight: "16px" }],
        "sap-sm": ["12px", { lineHeight: "18px" }],
        "sap-md": ["14px", { lineHeight: "20px" }],
        "sap-lg": ["16px", { lineHeight: "22px" }],
        "sap-xl": ["20px", { lineHeight: "28px", fontWeight: "700" }],
      },

      borderRadius: {
        "sap-sm": "4px",
        "sap":    "6px",
        "sap-lg": "8px",
        "sap-xl": "12px",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      boxShadow: {
        "sap-card":  "0 1px 3px 0 rgb(0 0 0 / .08), 0 1px 2px -1px rgb(0 0 0 / .06)",
        "sap-panel": "0 2px 8px rgb(0 0 0 / .10)",
        "sap-modal": "0 8px 32px rgb(0 0 0 / .16)",
        "sap-focus": "0 0 0 3px rgb(37 99 235 / .25)",
        card:        "0 1px 3px 0 rgb(0 0 0 / .08), 0 1px 2px -1px rgb(0 0 0 / .06)",
        shell:       "0 1px 4px 0 rgb(0 0 0 / .22)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
