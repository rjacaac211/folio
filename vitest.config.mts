import { defineConfig } from "vitest/config";

export default defineConfig({
  // Vite resolves the "@/*" alias from tsconfig.json natively.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["{app,lib}/**/*.test.ts"],
  },
});
