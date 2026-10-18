import { defineConfig } from "vitest/config";

// Tes integrasi memakai PostgreSQL nyata (DATABASE_URL). Jalankan dengan
// `npm run test:integration`. Bila DATABASE_URL kosong, tes akan di-skip.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["tests/integration/setup.ts"],
    globalSetup: ["tests/integration/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
