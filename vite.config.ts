import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 1500,
    allowedHosts: ["beta-testy.busearch.pl"],
    proxy: {
      "/api": {
        target: "http://127.0.0.1:47821",
        changeOrigin: true,
      },
      "^/(bydgoszcz|torun|trojmiasto)/api/": {
        target: "http://127.0.0.1:47821",
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 1500,
    allowedHosts: ["beta-testy.busearch.pl"],
    proxy: {
      "/api": {
        target: "http://127.0.0.1:47821",
        changeOrigin: true,
      },
      "^/(bydgoszcz|torun|trojmiasto)/api/": {
        target: "http://127.0.0.1:47821",
        changeOrigin: true,
      },
    },
  },
});
