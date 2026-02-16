import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  server: {
    port: 5173,
    cors: {
      origin: "http://127.0.0.1:5000",
    },
    // Proxy API calls to Flask in dev mode
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    manifest: true,
    rollupOptions: {
      input: "src/main.js",
    },
  },
});
