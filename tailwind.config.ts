import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        status: {
          todo: "#64748b",
          doing: "#3b82f6",
          waiting: "#f59e0b",
          done: "#10b981",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
