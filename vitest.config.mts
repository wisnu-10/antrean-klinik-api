import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    // Tes integrasi DB dipisah; lihat vitest.integration.config.mts.
    include: ["tests/**/*.test.ts", "!tests/integration/**"],
  },
});
