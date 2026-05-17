import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "windowgrid/react": resolve(__dirname, "../src/react/index.ts"),
      "windowgrid/core": resolve(__dirname, "../src/core/index.ts"),
      windowgrid: resolve(__dirname, "../src/core/index.ts"),
    },
  },
});
