import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  server: {
    port: 3000,
    fs: {
      strict: false,
    },
  },
  define: {
    "process.env": {},
  },
  optimizeDeps: {
    exclude: ["as-geo-web-coordinate"],
  },
  resolve: {
    alias: {
      "~bootstrap": path.resolve(__dirname, "node_modules/bootstrap"),
      "@geo-web/mud-world-base-contracts": path.resolve(
        __dirname,
        "node_modules",
        "@geo-web",
        "mud-world-base-contracts"
      ),
    },
  },
  build: {
    target: "esnext",
    minify: true,
    sourcemap: true,
  },
});
