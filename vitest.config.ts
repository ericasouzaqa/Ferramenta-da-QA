import { defineConfig } from "vitest/config";
import path from "path";

const projectRoot = path.resolve(import.meta.dirname);

export default defineConfig({
    root: projectRoot,
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "client", "src"),
    },
  },
  test: {
    environment: "node",
    include: ["client/src/lib/**/*.test.ts", "client/src/lib/**/*.spec.ts", "client/src/pages/**/*.test.tsx"],
    environmentMatchGlobs: [["client/src/pages/**/*.test.tsx", "jsdom"]],
  },
});
