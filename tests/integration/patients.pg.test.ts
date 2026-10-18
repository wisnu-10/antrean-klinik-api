import type { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "../../generated/prisma/client";
import { wibCompactDate } from "../../src/helpers/date";

const DATABASE_URL = process.env.DATABASE_URL;
const enabled = typeof DATABASE_URL === "string" && DATABASE_URL.trim() !== "";

interface Envelope<T> {
  success: boolean;
  data: T;
}

interface PatientBody {
  id: string;
  medicalRecord: string;
  name: string;
  dateBirth: string;
}

interface PatientListBody {
  items: PatientBody[];
  total: number;
}

describe.skipIf(!enabled)("pasien (DB nyata)", () => {
  let app!: Express;
  let prisma!: PrismaClient;
  let adminId!: string;
  let token!: string;
  let patientId!: string;
  let marker!: string;
  let ready = false;

  beforeAll(async () => {
    const appModule = await import("../../src/app");
    const prismaModule = await import("../../src/prisma");
    const tokenModule = await import("../../src/helpers/token");

    app = appModule.default;
    prisma = prismaModule.prisma;

    const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    marker = `Pasien-PG-${suffix}`;
    const admin = await prisma.user.create({
      data: {
        username: `pg-${suffix}`,
        nama: "Admin PG",
        role: "admin",
        passwordHash: "not-used",
      },
    });
    adminId = admin.id;
    token = tokenModule.signAccessToken({ sub: admin.id, username: admin.username, role: "admin" });
    ready = true;
  });

  afterAll(async () => {
    if (!ready) {
      return;
    }
    await prisma.visit.deleteMany({ where: { registeredBy: adminId } });
    await prisma.patient.deleteMany({ where: { name: marker } });
    await prisma.user.delete({ where: { id: adminId } });
    await prisma.$disconnect();
  });

  it("membuat pasien dengan nomor rekam medis RM-YYYYMMDD-NNNN", async () => {
    const res = await request(app)
      .post("/api/patients")
      .set("Cookie", `accessToken=${token}`)
      .send({
        name: marker,
        placeBirth: "Bandung",
        dateBirth: "1990-05-10",
        address: "Jl. Merdeka No. 1",
      });

    expect(res.status).toBe(201);
    const body = res.body as Envelope<PatientBody>;
    patientId = body.data.id;
    expect(body.data.medicalRecord).toMatch(/^RM-\d{8}-\d{4}$/);
    expect(body.data.medicalRecord.startsWith(`RM-${wibCompactDate()}-`)).toBe(true);
    expect(body.data.dateBirth).toBe("1990-05-10");
  });

  it("menemukan pasien lewat pencarian nama (case-insensitive)", async () => {
    const res = await request(app)
      .get(`/api/patients?name=${marker.slice(0, 8).toLowerCase()}`)
      .set("Cookie", `accessToken=${token}`);

    expect(res.status).toBe(200);
    const body = res.body as Envelope<PatientListBody>;
    expect(body.data.items.some((item) => item.id === patientId)).toBe(true);
  });

  it("menemukan pasien lewat nomor rekam medis & tanggal lahir", async () => {
    const detail = await request(app).get(`/api/patients/${patientId}`).set("Cookie", `accessToken=${token}`);
    const { medicalRecord } = (detail.body as Envelope<PatientBody>).data;

    const byRm = await request(app)
      .get(`/api/patients?rm=${medicalRecord}`)
      .set("Cookie", `accessToken=${token}`);
    expect((byRm.body as Envelope<PatientListBody>).data.items).toHaveLength(1);

    const byDob = await request(app)
      .get("/api/patients?dob=1990-05-10&name=PG")
      .set("Cookie", `accessToken=${token}`);
    expect((byDob.body as Envelope<PatientListBody>).data.items.some((item) => item.id === patientId)).toBe(true);
  });

  it("menemukan pasien lewat slug nama + nomor rekam medis", async () => {
    const detail = await request(app).get(`/api/patients/${patientId}`).set("Cookie", `accessToken=${token}`);
    const { medicalRecord } = (detail.body as Envelope<PatientBody>).data;

    const slug = `${marker.toLowerCase()}-${medicalRecord.toLowerCase()}`;
    const bySlug = await request(app).get(`/api/patients/${slug}`).set("Cookie", `accessToken=${token}`);

    expect(bySlug.status).toBe(200);
    expect((bySlug.body as Envelope<PatientBody>).data.id).toBe(patientId);
  });

  it("menyembunyikan pasien yang sudah di-soft-delete", async () => {
    const deleted = await request(app).delete(`/api/patients/${patientId}`).set("Cookie", `accessToken=${token}`);
    expect(deleted.status).toBe(200);

    const detail = await request(app).get(`/api/patients/${patientId}`).set("Cookie", `accessToken=${token}`);
    expect(detail.status).toBe(404);

    const list = await request(app)
      .get(`/api/patients?name=${marker}`)
      .set("Cookie", `accessToken=${token}`);
    expect((list.body as Envelope<PatientListBody>).data.items).toHaveLength(0);
  });
});
