import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Build into ../docs (GitHub Pages serves from /docs on main).
// emptyOutDir:false preserves docs/data/*.json written by the cron.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "../docs",
    emptyOutDir: false,
    assetsDir: "assets",
  },
});
