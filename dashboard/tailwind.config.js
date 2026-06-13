/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0a0a0f",
        panel: "#0f0f17",
        neon: {
          cyan: "#22d3ee",
          blue: "#38bdf8",
          magenta: "#e879f9",
          pink: "#f472b6",
          lime: "#a3e635",
          green: "#34d399",
          amber: "#fbbf24",
          red: "#fb7185",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px -2px var(--tw-shadow-color)",
        "glow-lg": "0 0 40px -4px var(--tw-shadow-color)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};
