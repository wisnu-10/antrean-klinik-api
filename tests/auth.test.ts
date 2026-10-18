import bcrypt from "bcrypt";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "../generated/prisma/client";
import app from "../src/app";
import { signAccessToken, signRefreshToken } from "../src/helpers/token";
import { readSetCookies, type DataEnvelope, type UserBody } from "./support/http";

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

let passwordHash = "";

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: "3d4e5f6a-7b8c-4d9e-8f0a-1b2c3d4e5f6a",
    username: "admin1",
    passwordHash,
    nama: "Admin Satu",
    role: "admin",
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

beforeAll(async () => {
  passwordHash = await bcrypt.hash("Admin123!", 12);
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe("POST /api/auth/login", () => {
  it("berhasil, men-set cookie httpOnly, dan tidak membocorkan password", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(buildUser());

    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "admin1", password: "Admin123!" });

    expect(res.status).toBe(200);
    const body = res.body as DataEnvelope<{ user: UserBody }>;
    expect(body.success).toBe(true);
    expect(body.data.user.username).toBe("admin1");
    expect(body.data.user.role).toBe("admin");

    const cookies = readSetCookies(res.headers).join(";");
    expect(cookies).toContain("accessToken=");
    expect(cookies).toContain("refreshToken=");
    expect(cookies).toContain("role=");
    expect(cookies).toContain("HttpOnly");
    expect(JSON.stringify(body)).not.toContain(passwordHash);
  });

  it("gagal dengan password salah", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(buildUser());

    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "admin1", password: "PasswordSalah1" });

    expect(res.status).toBe(401);
    expect((res.body as DataEnvelope<null>).success).toBe(false);
  });

  it("gagal bila username tidak ditemukan", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "tidak-ada", password: "Admin123!" });

    expect(res.status).toBe(401);
  });

  it("gagal 403 bila akun nonaktif", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(buildUser({ isActive: false }));

    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "admin1", password: "Admin123!" });

    expect(res.status).toBe(403);
  });

  it("gagal validasi 422 bila body kosong", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "", password: "" });

    expect(res.status).toBe(422);
    const body = res.body as { success: boolean; errors: { field: string }[] };
    expect(body.success).toBe(false);
    expect(body.errors.length).toBeGreaterThan(0);
  });
});

describe("GET /api/auth/me", () => {
  it("401 tanpa cookie", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("200 dengan access token valid", async () => {
    const user = buildUser();
    mockPrisma.user.findUnique.mockResolvedValue(user);
    const token = signAccessToken({ sub: user.id, username: user.username, role: "admin" });

    const res = await request(app).get("/api/auth/me").set("Cookie", `accessToken=${token}`);

    expect(res.status).toBe(200);
    const body = res.body as DataEnvelope<{ user: UserBody }>;
    expect(body.data.user.id).toBe(user.id);
  });

  it("401 dengan access token tidak valid", async () => {
    const res = await request(app).get("/api/auth/me").set("Cookie", "accessToken=token-palsu");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("200 dan menghapus cookie auth", async () => {
    const res = await request(app).post("/api/auth/logout");

    expect(res.status).toBe(200);
    const cookies = readSetCookies(res.headers).join(";");
    expect(cookies).toContain("accessToken=;");
    expect(cookies).toContain("refreshToken=;");
  });
});

describe("POST /api/auth/refresh", () => {
  it("200 dan memperbarui access token", async () => {
    const user = buildUser();
    mockPrisma.user.findUnique.mockResolvedValue(user);
    const token = signRefreshToken({ sub: user.id });

    const res = await request(app).post("/api/auth/refresh").set("Cookie", `refreshToken=${token}`);

    expect(res.status).toBe(200);
    expect(readSetCookies(res.headers).join(";")).toContain("accessToken=");
  });

  it("401 tanpa refresh token", async () => {
    const res = await request(app).post("/api/auth/refresh");
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/auth/password", () => {
  it("200 saat password lama benar", async () => {
    const user = buildUser();
    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.user.update.mockResolvedValue(user);
    const token = signAccessToken({ sub: user.id, username: user.username, role: "admin" });

    const res = await request(app)
      .patch("/api/auth/password")
      .set("Cookie", `accessToken=${token}`)
      .send({ currentPassword: "Admin123!", newPassword: "PasswordBaru1" });

    expect(res.status).toBe(200);
    expect(mockPrisma.user.update).toHaveBeenCalledTimes(1);
  });

  it("400 saat password lama salah", async () => {
    const user = buildUser();
    mockPrisma.user.findUnique.mockResolvedValue(user);
    const token = signAccessToken({ sub: user.id, username: user.username, role: "admin" });

    const res = await request(app)
      .patch("/api/auth/password")
      .set("Cookie", `accessToken=${token}`)
      .send({ currentPassword: "SalahSekali1", newPassword: "PasswordBaru1" });

    expect(res.status).toBe(400);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("422 bila ada field asing (strict)", async () => {
    const token = signAccessToken({ sub: buildUser().id, username: "admin1", role: "admin" });

    const res = await request(app)
      .patch("/api/auth/password")
      .set("Cookie", `accessToken=${token}`)
      .send({ currentPassword: "Admin123!", newPassword: "PasswordBaru1", confirmPassword: "PasswordBaru1" });

    expect(res.status).toBe(422);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });
});
