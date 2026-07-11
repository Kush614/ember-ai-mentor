/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Daylight side
        morning: "#F6F7F4",
        cloud: "#EBEEE8",
        ink: "#20262E",
        slate2: "#5C6672",

        // Night side (Ember Field)
        twilight: "#131A33",
        deepnight: "#0C1026",

        // The ember system
        ember: "#FF9E4A",
        emberhot: "#FFC46B",
        cinder: "#B4552D",
        flicker: "#E8B84B",

        // Constellation
        starblue: "#8FB4FF",
        goalgold: "#FFD98E",
        moss: "#7FC8A9",

        // Gumroad-style course dashboard palette
        gum: {
          pink: "#FF90E8",
          yellow: "#FFC900",
          lav: "#B5A8FF",
          blue: "#90A8ED",
          mint: "#63D2A2",
          peach: "#FFC7A6",
          cream: "#F1F0EA",
          black: "#000000",
        },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ['"Atkinson Hyperlegible"', "ui-sans-serif", "system-ui", "sans-serif"],
        data: ['"Space Grotesk"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        day: "0 2px 12px rgb(32 38 46 / 0.06)",
      },
      borderRadius: {
        card: "16px",
        bubble: "24px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "card-rise": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        breathe: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.02)" },
        },
        // irregular flicker, like a dying coal
        emberflicker: {
          "0%": { opacity: "1" },
          "13%": { opacity: "0.72" },
          "21%": { opacity: "0.95" },
          "38%": { opacity: "0.78" },
          "52%": { opacity: "1" },
          "67%": { opacity: "0.7" },
          "74%": { opacity: "0.92" },
          "88%": { opacity: "0.8" },
          "100%": { opacity: "1" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(1)", opacity: "0.8" },
          "100%": { transform: "scale(2.1)", opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.35s ease-out",
        "card-rise": "card-rise 0.5s cubic-bezier(.2,.9,.3,1) forwards",
        breathe: "breathe 4s ease-in-out infinite",
        flicker: "emberflicker 3s linear infinite",
        "pulse-ring": "pulse-ring 0.6s ease-out forwards",
        "pulse-ring-x3": "pulse-ring 0.55s ease-out 3 forwards",
        shimmer: "shimmer 1s linear",
      },
    },
  },
  plugins: [],
};
