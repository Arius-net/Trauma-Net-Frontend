import type { Config } from "tailwindcss";

/**
 * Tokens del sistema visual «Modern Blue» (Figma: Fundaciones).
 * Los valores viven como variables CSS en globals.css; aquí solo se exponen a Tailwind.
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: "var(--color-brand)",
        accent: "var(--color-accent)",
        app: "var(--color-bg-app)",
        surface: "var(--color-bg-surface)",
        subtle: "var(--color-bg-subtle)",
        selected: "var(--color-bg-selected)",
        link: "var(--color-text-link)",
        "on-nav": "var(--color-text-on-nav)",
        n: {
          50: "var(--n-50)",
          100: "var(--n-100)",
          200: "var(--n-200)",
          300: "var(--n-300)",
          400: "var(--n-400)",
          500: "var(--n-500)",
          600: "var(--n-600)",
          700: "var(--n-700)",
          800: "var(--n-800)",
          900: "var(--n-900)",
        },
        triage: {
          rojo: "var(--triage-rojo)",
          amarillo: "var(--triage-amarillo)",
          verde: "var(--triage-verde)",
          negro: "var(--triage-negro)",
        },
        error: "var(--color-error)",
      },
      borderRadius: {
        sm: "2px",
        md: "4px",
        lg: "6px",
        xl: "8px",
      },
      fontFamily: {
        sans: ["var(--font-plex-sans)", "system-ui", "sans-serif"],
        cond: ["var(--font-plex-cond)", "var(--font-plex-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        toast: "0 8px 12px rgba(10, 36, 99, 0.22)",
      },
      borderWidth: {
        3: "3px",
      },
    },
  },
  plugins: [],
};

export default config;
