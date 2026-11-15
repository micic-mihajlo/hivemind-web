import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        lawFirms: resolve(__dirname, "law-firms/index.html"),
        pricing: resolve(__dirname, "pricing/index.html"),
      },
    },
  },
  server: {
    port: 5173,
  },
});
