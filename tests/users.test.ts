import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "../generated/prisma/client";
import app from "../src/app";
import { signAccessToken } from "../src/helpers/token";
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

const SUPERADMIN_ID = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const TARGET_ID = "1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e";

function superadminToken(): string {
  return signAccessToken({ sub: SUPERADMIN_ID, username: "superadmin", role: "superadmin" });
}

function adminToken(): string {
  return signAccessToken({ sub: TARGET_ID, username: "admin1", role: "admin" });
}

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: TARGET_ID,
    username: "admin1",
    passwordHash: "$2b$12$abcdefghijklmnopqrstuvabcdefghijklmnopqrstuvabcdefghi",
    nama: "Admin Satu",
    role: "admin",
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("guard role /api/users", () => {
  it("401 tanpa token", async () => {
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(401);
  });

  it("403 untuk role admin", async () => {
    const res = await request(app).get("/api/users").set("Cookie", `accessToken=${adminToken()}`);
    expect(res.status).toBe(403);
  });
});

describe("GET /api/users", () => {
  it("200 mengembalikan daftar tanpa password hash", async () => {
    mockPrisma.user.findMany.mockResolvedValue([buildUser()]);

    const res = await request(app).get("/api/users").set("Cookie", `accessToken=${superadminToken()}`);

    expect(res.status).toBe(200);
    const body = res.body as DataEnvelope<UserBody[]>;
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.username).toBe("admin1");
    expect(JSON.stringify(body)).not.toContain("passwordHash");
  });
});

describe("POST /api/users", () => {
  it("201 membuat admin baru", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue(buildUser({ id: "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e6f", username: "admin2" }));

    const res = await request(app)
      .post("/api/users")
      .set("Cookie", `accessToken=${superadminToken()}`)
      .send({ username: "admin2", nama: "Admin Dua", password: "Rahasia123" });

    expect(res.status).toBe(201);
    const body = res.body as DataEnvelope<UserBody>;
    expect(body.data.username).toBe("admin2");
    expect(body.data.role).toBe("admin");
  });

  it("409 bila username sudah dipakai", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(buildUser());

    const res = await request(app)
      .post("/api/users")
      .set("Cookie", `accessToken=${superadminToken()}`)
      .send({ username: "admin1", nama: "Admin Satu", password: "Rahasia123" });

    expect(res.status).toBe(409);
  });

  it("422 bila password terlalu pendek", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Cookie", `accessToken=${superadminToken()}`)
      .send({ username: "admin2", nama: "Admin Dua", password: "pendek" });

    expect(res.status).toBe(422);
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it("422 bila ada field asing (strict)", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Cookie", `accessToken=${superadminToken()}`)
      .send({ username: "admin2", nama: "Admin Dua", password: "Rahasia123", role: "superadmin" });

    expect(res.status).toBe(422);
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/users/:id", () => {
  it("200 mengubah nama", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(buildUser());
    mockPrisma.user.update.mockResolvedValue(buildUser({ nama: "Nama Baru" }));

    const res = await request(app)
      .patch(`/api/users/${TARGET_ID}`)
      .set("Cookie", `accessToken=${superadminToken()}`)
      .send({ nama: "Nama Baru" });

    expect(res.status).toBe(200);
    const body = res.body as DataEnvelope<UserBody>;
    expect(body.data.nama).toBe("Nama Baru");
  });
});

describe("POST /api/users/:id/reset-password", () => {
  it("200 mereset password", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(buildUser());
    mockPrisma.user.update.mockResolvedValue(buildUser());

    const res = await request(app)
      .post(`/api/users/${TARGET_ID}/reset-password`)
      .set("Cookie", `accessToken=${superadminToken()}`)
      .send({ newPassword: "PasswordBaru1" });

    expect(res.status).toBe(200);
    expect(mockPrisma.user.update).toHaveBeenCalledTimes(1);
  });
});

describe("DELETE /api/users/:id", () => {
  it("400 bila menonaktifkan akun sendiri", async () => {
    const res = await request(app)
      .delete(`/api/users/${SUPERADMIN_ID}`)
      .set("Cookie", `accessToken=${superadminToken()}`);

    expect(res.status).toBe(400);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("200 menonaktifkan user lain", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(buildUser());
    mockPrisma.user.update.mockResolvedValue(buildUser({ isActive: false }));

    const res = await request(app)
      .delete(`/api/users/${TARGET_ID}`)
      .set("Cookie", `accessToken=${superadminToken()}`);

    expect(res.status).toBe(200);
    const cookies = readSetCookies(res.headers).join(";");
    expect(cookies).not.toContain("accessToken=");
    expect(mockPrisma.user.update).toHaveBeenCalledTimes(1);
  });
});
