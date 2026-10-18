import type { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "../../generated/prisma/client";

const DATABASE_URL = process.env.DATABASE_URL;
const enabled = typeof DATABASE_URL === "string" && DATABASE_URL.trim() !== "";

const CONCURRENCY = 10;

interface VisitBody {
  data: { id: string; queueNumber: number };
}

describe.skipIf(!enabled)("konkurensi nomor antrean (DB nyata)", () => {
  let app!: Express;
  let prisma!: PrismaClient;
  let adminId!: string;
  let patientId!: string;
  let token!: string;
  let ready = false;

  beforeAll(async () => {
    const appModule = await import("../../src/app");
    const prismaModule = await import("../../src/prisma");
    const tokenModule = await import("../../src/helpers/token");

    app = appModule.default;
    prisma = prismaModule.prisma;

    const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const admin = await prisma.user.create({
      data: {
        username: `conc-${suffix}`,
        nama: "Admin Konkurensi",
        role: "admin",
        passwordHash: "not-used",
      },
    });
    adminId = admin.id;
    token = tokenModule.signAccessToken({ sub: admin.id, username: admin.username, role: "admin" });

    const patient = await prisma.patient.create({
      data: {
        medicalRecord: `RM-T-${suffix.slice(0, 10)}`,
        name: "Pasien Konkurensi",
        placeBirth: "Test",
        dateBirth: new Date("1990-01-01T00:00:00.000Z"),
        address: "Test",
      },
    });
    patientId = patient.id;
    ready = true;
  });

  afterAll(async () => {
    if (!ready) {
      return;
    }
    await prisma.visit.deleteMany({ where: { patientId } });
    await prisma.patient.delete({ where: { id: patientId } });
    await prisma.user.delete({ where: { id: adminId } });
    await prisma.$disconnect();
  });

  it("memberi nomor antrean unik & berurutan untuk permintaan paralel", async () => {
    const responses = await Promise.all(
      Array.from({ length: CONCURRENCY }, (_, index) =>
        request(app)
          .post("/api/visits")
          .set("Cookie", `accessToken=${token}`)
          .send({ patientId, complaint: `Keluhan paralel ${String(index + 1)}` }),
      ),
    );

    expect(responses.every((response) => response.status === 201)).toBe(true);

    const numbers = responses.map((response) => (response.body as VisitBody).data.queueNumber);
    expect(new Set(numbers).size).toBe(CONCURRENCY);

    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    expect(max - min + 1).toBe(CONCURRENCY);

    const count = await prisma.visit.count({ where: { patientId, deletedAt: null } });
    expect(count).toBe(CONCURRENCY);
  });

  it("tidak memakai ulang nomor antrean setelah soft delete", async () => {
    const first = await request(app)
      .post("/api/visits")
      .set("Cookie", `accessToken=${token}`)
      .send({ patientId, complaint: "Akan dihapus" });
    const firstNumber = (first.body as VisitBody).data.queueNumber;

    const removed = await request(app)
      .delete(`/api/visits/${(first.body as VisitBody).data.id}`)
      .set("Cookie", `accessToken=${token}`);
    expect(removed.status).toBe(200);

    const next = await request(app)
      .post("/api/visits")
      .set("Cookie", `accessToken=${token}`)
      .send({ patientId, complaint: "Setelah dihapus" });

    expect((next.body as VisitBody).data.queueNumber).toBeGreaterThan(firstNumber);
  });
});
