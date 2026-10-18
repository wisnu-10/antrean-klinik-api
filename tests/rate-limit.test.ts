import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/app";
import { errorHandler } from "../src/middlewares/errorHandler";
import { createRateLimiter } from "../src/middlewares/rateLimit";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../src/prisma", () => ({ prisma: mockPrisma }));

beforeEach(() => {
  vi.resetAllMocks();
});

interface ErrorEnvelope {
  success: boolean;
  message: string;
  data: null;
}

// App kecil dengan limiter + errorHandler agar envelope standar ikut diuji.
function buildProbeApp(handlerStatus: number, limit = 2): express.Express {
  const probe = express();
  probe.use(express.json());
  probe.post(
    "/probe",
    createRateLimiter({ windowMs: 60_000, limit, message: "Terlalu banyak percobaan." }),
    (_req, res) => {
      res.status(handlerStatus).json({ success: handlerStatus < 400, message: "probe", data: null });
    },
  );
  probe.use(errorHandler);
  return probe;
}

describe("createRateLimiter", () => {
  it("mengembalikan 429 + envelope setelah batas terlampaui", async () => {
    const probe = buildProbeApp(401);

    await request(probe).post("/probe").expect(401);
    await request(probe).post("/probe").expect(401);

    const blocked = await request(probe).post("/probe").expect(429);
    const body = blocked.body as ErrorEnvelope;
    expect(body.success).toBe(false);
    expect(body.data).toBeNull();
    expect(body.message.length).toBeGreaterThan(0);
    expect(blocked.headers["ratelimit"]).toBeDefined();
  });

  it("tidak menghitung permintaan sukses (skipSuccessfulRequests)", async () => {
    const probe = buildProbeApp(200, 1);

    for (let index = 0; index < 5; index += 1) {
      await request(probe).post("/probe").expect(200);
    }
  });
});

describe("POST /api/auth/login (terpasang limiter)", () => {
  it("mengembalikan 429 setelah 5 percobaan gagal beruntun", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    for (let index = 0; index < 5; index += 1) {
      await request(app).post("/api/auth/login").send({ username: "tidak-ada", password: "Admin123!" }).expect(401);
    }

    const blocked = await request(app)
      .post("/api/auth/login")
      .send({ username: "tidak-ada", password: "Admin123!" })
      .expect(429);

    const body = blocked.body as ErrorEnvelope;
    expect(body.success).toBe(false);
    expect(body.data).toBeNull();
    expect(body.message.length).toBeGreaterThan(0);
  });
});
