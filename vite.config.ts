import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  base: process.env.NODE_ENV === "production" ? "/satgen/" : "/",
  worker: {
    format: "es",
  },
  build: {
    rollupOptions: {
      output: {
        format: "es",
      },
    },
  },
});
