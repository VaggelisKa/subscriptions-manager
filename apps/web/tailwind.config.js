/** @type {import('tailwindcss').Config} */

// Tokens mirror the native app (`apps/native/src/lib/theme.ts`); the CSS
// variables are defined in `src/app/globals.css`.
const color = (name) => `hsl(var(--${name}) / <alpha-value>)`;

module.exports = {
  future: {
    hoverOnlyWhenSupported: true,
  },
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: color("background"),
        surface: color("surface"),
        foreground: color("foreground"),
        faint: color("faint"),
        separator: color("separator"),
        fill: "hsl(var(--fill))",
        primary: {
          DEFAULT: color("primary"),
          foreground: color("primary-foreground"),
          // Fill for orange buttons with white text (a step deeper than the accent).
          button: color("primary-button"),
          "button-hover": color("primary-button-hover"),
          "button-active": color("primary-button-active"),
          text: color("primary-text"),
          soft: "hsl(var(--primary-soft))",
        },
        destructive: {
          DEFAULT: color("destructive"),
          foreground: color("destructive-foreground"),
        },
        success: {
          DEFAULT: color("success"),
          foreground: color("success-foreground"),
        },
        muted: {
          DEFAULT: "hsl(var(--fill))",
          foreground: color("muted-foreground"),
        },
        // Aliases kept for the shadcn/ui primitives (select, popover, toast).
        border: color("separator"),
        input: color("separator"),
        ring: color("primary"),
        card: { DEFAULT: color("surface"), foreground: color("foreground") },
        popover: { DEFAULT: color("surface"), foreground: color("foreground") },
        accent: { DEFAULT: "hsl(var(--fill))", foreground: color("foreground") },
        secondary: {
          DEFAULT: "hsl(var(--fill))",
          foreground: color("foreground"),
        },
      },
      fontFamily: {
        sans: ["var(--font-nunito)", "ui-rounded", "system-ui", "sans-serif"],
      },
      // Native type scale (size / line height / tracking / weight).
      fontSize: {
        amount: ["46px", { lineHeight: "50px", letterSpacing: "-1.6px", fontWeight: "900" }],
        "large-title": ["34px", { lineHeight: "41px", letterSpacing: "-0.6px", fontWeight: "900" }],
        title: ["22px", { lineHeight: "28px", letterSpacing: "-0.3px", fontWeight: "800" }],
        section: ["18px", { lineHeight: "23px", fontWeight: "800" }],
        headline: ["16px", { lineHeight: "21px", fontWeight: "700" }],
        body: ["16px", { lineHeight: "22px" }],
        subhead: ["15px", { lineHeight: "20px", fontWeight: "600" }],
        footnote: ["13px", { lineHeight: "18px", fontWeight: "600" }],
        caption: ["11px", { lineHeight: "13px", fontWeight: "700" }],
      },
      // Native radii: nested surfaces use outer radius minus padding.
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "22px",
        sheet: "34px",
      },
      // Shadows only on things that float (toolbar glass, menus, sheets).
      boxShadow: {
        float: "0 6px 20px -8px rgb(28 25 23 / 0.25), 0 0 0 0.5px rgb(28 25 23 / 0.08)",
        sheet: "0 30px 80px -20px rgb(12 10 9 / 0.45)",
        mark: "0 10px 24px -10px rgb(249 115 22 / 0.7)",
      },
      keyframes: {
        "sheet-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "sheet-down": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(100%)" },
        },
        skeleton: { "0%, 100%": { opacity: "0.5" }, "50%": { opacity: "0.85" } },
        // A newly added ledger row: a stronger tint settling into the selected one.
        "row-flash": {
          "0%, 35%": { backgroundColor: "hsl(var(--primary) / 0.3)" },
          "100%": { backgroundColor: "hsl(var(--primary-soft))" },
        },
      },
      animation: {
        "sheet-up": "sheet-up 320ms cubic-bezier(0.32, 0.72, 0, 1)",
        "sheet-down": "sheet-down 220ms cubic-bezier(0.32, 0.72, 0, 1)",
        skeleton: "skeleton 2.4s ease-in-out infinite",
        "row-flash": "row-flash 1.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
