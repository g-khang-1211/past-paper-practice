import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx}",
    "./.codex/design/**/*.{html,md}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0e0e0e",
        surface: "#0e0e0e",
        "surface-dim": "#0e0e0e",
        "surface-container-lowest": "#000000",
        "surface-container-low": "#131313",
        "surface-container": "#1a1a1a",
        "surface-container-high": "#20201f",
        "surface-container-highest": "#262626",
        "surface-bright": "#2c2c2c",
        "surface-variant": "#262626",
        primary: "#99f7ff",
        "primary-container": "#00f1fe",
        secondary: "#ac8aff",
        tertiary: "#ff59e3",
        "error-dim": "#d7383b",
        "on-surface": "#ffffff",
        "on-surface-variant": "#adaaaa",
        "outline-variant": "#484847",
      },
      fontFamily: {
        headline: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-manrope)", "sans-serif"],
        label: ["var(--font-manrope)", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "1rem",
        lg: "2rem",
        xl: "3rem",
      },
      boxShadow: {
        "glow-primary": "0 0 30px rgba(0, 241, 254, 0.18)",
        "shell-sidebar": "20px 0 40px rgba(0,0,0,0.8)",
        "shell-right": "-20px 0 40px rgba(0,0,0,0.5)",
        "shell-top": "0 4px 30px rgba(0,0,0,0.5)",
      },
      backdropBlur: {
        shell: "24px",
      },
      backgroundImage: {
        "flow-gradient": "linear-gradient(135deg, #99f7ff 0%, #00f1fe 100%)",
        "shell-fade": "linear-gradient(180deg, rgba(26,26,26,1) 0%, rgba(26,26,26,0) 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
