import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // GitHub Pages 项目站点挂在 /chishenme/ 下
  base: "/chishenme/",
  plugins: [react()],
  test: { include: ["src/**/*.test.ts"] },
});
