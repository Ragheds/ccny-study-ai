import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary"],
      include: ["lib/**/*.ts", "hooks/**/*.ts", "data/**/*.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
