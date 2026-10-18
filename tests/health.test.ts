import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import type { Express } from "express";

let app: Express;

beforeAll(async () => {
  process.env.JWT_ACCESS_SECRET ??= "test-access-secret-please-change";
  process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-please-change";
  process.env.FRONTEND_URL ??= "http://localhost:3000";
  const mod = await import("../src/app");
  app = mod.default;
});

describe("GET /api/health", () => {
  it("responds 200 with success envelope", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true });
  });

  it("responds 404 for unknown routes", async () => {
    const res = await request(app).get("/api/route-yang-tidak-ada");
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, data: null });
  });
});
