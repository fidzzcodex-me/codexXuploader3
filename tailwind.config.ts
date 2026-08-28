import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0f2247",
        surface: "#ffffff",
        cloud: "#f4f8ff",
        mist: "#e8f0fe",
        line: "#dbe7fb",
        primary: {
          50: "#eef5ff",
          100: "#dbe9ff",
          200: "#b9d4ff",
          300: "#8bb6ff",
          400: "#5a92ff",
          500: "#356dfb",
          600: "#204de0",
          700: "#1c3db3",
          800: "#1c358c",
          900: "#1c306f"
        },
        sky: {
          soft: "#eaf3ff",
          glow: "#c7ddff"
        }
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"]
      },
      boxShadow: {
        soft: "0 8px 30px -12px rgba(32, 77, 224, 0.18)",
        card: "0 2px 10px -2px rgba(15, 34, 71, 0.08)",
        glow: "0 0 0 1px rgba(53,109,251,0.12), 0 12px 40px -10px rgba(53,109,251,0.35)"
      },
      animation: {
        "float-slow": "float 7s ease-in-out infinite",
        "float-slower": "float 11s ease-in-out infinite",
        "pulse-soft": "pulseSoft 3s ease-in-out infinite",
        "gradient-shift": "gradientShift 12s ease infinite",
        "fade-up": "fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) forwards",
        "fab-bob": "fabBob 3.4s ease-in-out infinite"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px) translateX(0px)" },
          "50%": { transform: "translateY(-18px) translateX(8px)" }
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.05)" }
        },
        fabBob: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-5px)" }
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" }
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      }
    }
  },
  plugins: []
};

export default config;
