/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        field: "#0f766e",
        sun: "#f59e0b",
      },
      boxShadow: {
        panel: "0 18px 60px rgba(17, 24, 39, 0.12)",
      },
    },
  },
  plugins: [],
};

