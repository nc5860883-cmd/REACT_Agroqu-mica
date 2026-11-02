import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Si ya tenés un vite.config.js, solo agregá el bloque `server.proxy`.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
});