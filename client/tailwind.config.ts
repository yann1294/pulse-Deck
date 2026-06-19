import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./types/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        graphite: {
          50: "#f7f7f8",
          100: "#ededf0",
          200: "#d9d9df",
          300: "#b7b8c1",
          400: "#8f909d",
          500: "#71727f",
          600: "#5b5c66",
          700: "#474852",
          800: "#2f3038",
          900: "#1d1e24",
          950: "#0b0c10"
        },
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          950: "#022c22"
        },
        lagoon: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
          950: "#042f2e"
        }
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem"
      },
      boxShadow: {
        glow: "0 0 0 1px rgb(16 185 129 / 0.14), 0 24px 80px rgb(15 23 42 / 0.22)",
        panel: "0 18px 60px rgb(15 23 42 / 0.12)",
        "panel-dark": "0 22px 70px rgb(0 0 0 / 0.32)",
        "panel-soft": "0 18px 45px rgb(15 23 42 / 0.08)"
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ]
      },
      spacing: {
        shell: "clamp(1rem, 3vw, 2rem)"
      }
    }
  },
  plugins: []
};

export default config;
