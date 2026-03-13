import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Identidade Visual Via Group
        via: {
          blue: "#4B5FBF",        // Azul escuro/roxo principal
          medium: "#5A6FD6",      // Azul médio
          cyan: "#00AEEF",        // Azul ciano
          dark: "#4040B0",        // Azul mais escuro para gradientes
          green: "#28A745",       // Verde status ativo
          gray: "#6C757D",        // Cinza escuro status
          text: "#333333",        // Texto padrão
          input: "#F0F4F8",       // Fundo dos inputs
          badge: "#F0F4F8",       // Fundo de badges
        },
        // Cores legacy (manter compatibilidade)
        sidebar: "#0f172a",
        "sidebar-hover": "#1e293b",
        "sidebar-active": "#2563eb",
        content: "#f1f5f9",
        border: "#e2e8f0",
      },
      fontFamily: {
        sans: ["Inter", "Nunito", "Roboto", "system-ui", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
      borderRadius: {
        pill: "30px",
        card: "12px",
      },
      boxShadow: {
        soft: "0 4px 20px rgba(0, 0, 0, 0.08)",
        card: "0 2px 12px rgba(0, 0, 0, 0.06)",
      },
    },
  },
  plugins: [],
};
export default config;
