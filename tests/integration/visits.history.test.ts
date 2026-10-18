import type { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "../../generated/prisma/client";

const DATABASE_URL = process.env.DATABASE_URL;
const enabled = typeof DATABASE_URL === "string" && DATABASE_URL.trim() !== "";

interface VisitListBody {
  data: {
    items: Array<{ id: string; visitDate: string; queueNumber: number }>;
    total: number;
    page: number;
    limit: number;
  };
}

interface VisitBody {
  data: { id: string; queueNumber: number; visitDate: string };
}

describe.skipIf(!enabled)("riwayat kunjungan lintas tanggal (DB nyata)", () => {
  let app!: Express;
  let prisma!: PrismaClient;
  let adminId!: string;
  let patientId!: string;
  let token!: string;
  let ready = false;
  let pastDate!: Date;
  let pastDateString!: string;

  beforeAll(async () => {
    const appModule = await import("../../src/app");
    const prismaModule = await import("../../src/prisma");
    const tokenModule = await import("../../src/helpers/token");
    const dateModule = await import("../../src/helpers/date");

    app = appModule.default;
    prisma = prismaModule.prisma;

    const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const admin = await prisma.user.create({
      data: {
        username: `hist-${suffix}`,
        nama: "Admin Riwayat",
        role: "admin",
        passwordHash: "not-used",
      },
    });
    adminId = admin.id;
    token = tokenModule.signAccessToken({ sub: admin.id, username: admin.username, role: "admin" });

    const patient = await prisma.patient.create({
      data: {
        medicalRecord: `RM-H-${suffix.slice(0, 10)}`,
        name: "Pasien Riwayat",
        placeBirth: "Test",
        dateBirth: new Date("1990-01-01T00:00:00.000Z"),
        address: "Test",
      },
    });
    patientId = patient.id;

    // Kunjungan dua hari lalu, dibuat langsung agar tidak bergantung jam sistem.
    pastDateString = dateModule.wibDateString(new Date(Date.now() - 2 * 86_400_000));
    pastDate = dateModule.parseDateOnly(pastDateString);
    const lastOnPastDate = await prisma.visit.findFirst({
      where: { visitDate: pastDate },
      orderBy: { queueNumber: "desc" },
      select: { queueNumber: true },
    });
    await prisma.visit.create({
      data: {
        patientId,
        queueNumber: (lastOnPastDate?.queueNumber ?? 0) + 1,
        visitDate: pastDate,
        complaint: "Kunjungan dua hari lalu",
        status: "sudah_dilayani",
        servedAt: new Date(),
        registeredBy: admin.id,
      },
    });

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

  it("menampilkan kunjungan lama pada riwayat pasien", async () => {
    const today = await request(app)
      .post("/api/visits")
      .set("Cookie", `accessToken=${token}`)
      .send({ patientId, complaint: "Kunjungan hari ini" });
    expect(today.status).toBe(201);

    const history = await request(app)
      .get(`/api/visits?patientId=${patientId}`)
      .set("Cookie", `accessToken=${token}`);

    expect(history.status).toBe(200);
    const body = history.body as VisitListBody;
    expect(body.data.total).toBe(2);
    expect(body.data.items.map((item) => item.visitDate)).toEqual([
      (today.body as VisitBody).data.visitDate,
      pastDateString,
    ]);
  });

  it("antrean harian tidak memuat kunjungan hari lain", async () => {
    const queue = await request(app).get("/api/visits").set("Cookie", `accessToken=${token}`);

    expect(queue.status).toBe(200);
    const body = queue.body as VisitListBody;
    expect(body.data.items.some((item) => item.visitDate === pastDateString)).toBe(false);
  });

  it("riwayat pasien bisa dibatasi tanggal tertentu", async () => {
    const history = await request(app)
      .get(`/api/visits?patientId=${patientId}&date=${pastDateString}`)
      .set("Cookie", `accessToken=${token}`);

    expect(history.status).toBe(200);
    const body = history.body as VisitListBody;
    expect(body.data.total).toBe(1);
    expect(body.data.items[0]?.visitDate).toBe(pastDateString);
  });
});
