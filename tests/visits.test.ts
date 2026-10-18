import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/app";
import { wibDateString } from "../src/helpers/date";
import { signAccessToken } from "../src/helpers/token";
import type { DataEnvelope } from "./support/http";

const { mockPrisma, tx } = vi.hoisted(() => {
  const transaction = {
    $executeRaw: vi.fn(),
    patient: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    visit: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  };
  const client = {
    patient: { findFirst: vi.fn() },
    visit: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  return { mockPrisma: client, tx: transaction };
});

vi.mock("../src/prisma", () => ({ prisma: mockPrisma }));

const ADMIN_ID = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const SUPERADMIN_ID = "1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e";
const PATIENT_ID = "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e6f";
const VISIT_ID = "3d4e5f6a-7b8c-4d9e-8f1a-2b3c4d5e6f7a";

function adminToken(): string {
  return signAccessToken({ sub: ADMIN_ID, username: "admin1", role: "admin" });
}

function superadminToken(): string {
  return signAccessToken({ sub: SUPERADMIN_ID, username: "superadmin", role: "superadmin" });
}

function buildVisit(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: VISIT_ID,
    patientId: PATIENT_ID,
    registeredBy: ADMIN_ID,
    visitDate: new Date(`${wibDateString()}T00:00:00.000Z`),
    queueNumber: 1,
    complaint: "Demam sejak kemarin",
    status: "belum_dilayani",
    servedAt: null,
    createdAt: new Date("2026-10-16T02:00:00.000Z"),
    updatedAt: new Date("2026-10-16T02:00:00.000Z"),
    deletedAt: null,
    patient: { id: PATIENT_ID, medicalRecord: "RM-20261016-0001", name: "Budi Santoso" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mockPrisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
  tx.$executeRaw.mockResolvedValue(1);
});

describe("guard /api/visits", () => {
  it("401 tanpa token", async () => {
    const res = await request(app).get("/api/visits");
    expect(res.status).toBe(401);
  });

  it("403 untuk superadmin", async () => {
    const res = await request(app).get("/api/visits").set("Cookie", `accessToken=${superadminToken()}`);
    expect(res.status).toBe(403);
  });
});

describe("POST /api/visits", () => {
  it("201 membuat kunjungan pasien terdaftar dengan nomor antrean", async () => {
    tx.patient.findFirst.mockResolvedValue({ id: PATIENT_ID });
    tx.visit.findFirst.mockResolvedValue(null);
    tx.visit.create.mockResolvedValue({ id: VISIT_ID });
    mockPrisma.visit.findFirst.mockResolvedValue(buildVisit());

    const res = await request(app)
      .post("/api/visits")
      .set("Cookie", `accessToken=${adminToken()}`)
      .send({ patientId: PATIENT_ID, complaint: "Demam sejak kemarin" });

    expect(res.status).toBe(201);
    const body = res.body as DataEnvelope<{ queueNumber: number; patient: { name: string } }>;
    expect(body.data.queueNumber).toBe(1);
    expect(body.data.patient.name).toBe("Budi Santoso");
    const createArgs = tx.visit.create.mock.calls[0]?.[0] as { data: { registeredBy: string; queueNumber: number } };
    expect(createArgs.data.registeredBy).toBe(ADMIN_ID);
    expect(createArgs.data.queueNumber).toBe(1);
  });

  it("201 membuat pasien baru sekaligus kunjungan", async () => {
    tx.patient.findFirst.mockResolvedValue(null);
    tx.patient.create.mockResolvedValue({ id: PATIENT_ID });
    tx.visit.findFirst.mockResolvedValue(null);
    tx.visit.create.mockResolvedValue({ id: VISIT_ID });
    mockPrisma.visit.findFirst.mockResolvedValue(buildVisit());

    const res = await request(app)
      .post("/api/visits")
      .set("Cookie", `accessToken=${adminToken()}`)
      .send({
        complaint: "Batuk",
        newPatient: {
          name: "Siti Aminah",
          placeBirth: "Jakarta",
          dateBirth: "1985-03-20",
          address: "Jl. Sudirman",
        },
      });

    expect(res.status).toBe(201);
    expect(tx.patient.create).toHaveBeenCalledTimes(1);
    expect(tx.visit.create).toHaveBeenCalledTimes(1);
  });

  it("404 bila pasien terdaftar tidak ditemukan", async () => {
    tx.patient.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/visits")
      .set("Cookie", `accessToken=${adminToken()}`)
      .send({ patientId: PATIENT_ID, complaint: "Demam" });

    expect(res.status).toBe(404);
    expect(tx.visit.create).not.toHaveBeenCalled();
  });

  it("422 bila mengirim patientId dan newPatient sekaligus", async () => {
    const res = await request(app)
      .post("/api/visits")
      .set("Cookie", `accessToken=${adminToken()}`)
      .send({
        patientId: PATIENT_ID,
        complaint: "Demam",
        newPatient: { name: "X", placeBirth: "Y", dateBirth: "1990-01-01", address: "Z" },
      });

    expect(res.status).toBe(422);
    expect(tx.visit.create).not.toHaveBeenCalled();
  });

  it("422 bila ada field asing (strict)", async () => {
    const res = await request(app)
      .post("/api/visits")
      .set("Cookie", `accessToken=${adminToken()}`)
      .send({ patientId: PATIENT_ID, complaint: "Demam", queueNumber: 99 });

    expect(res.status).toBe(422);
    expect(tx.visit.create).not.toHaveBeenCalled();
  });
});

describe("GET /api/visits", () => {
  it("200 mengurutkan antrean FIFO per queue_number", async () => {
    mockPrisma.visit.count.mockResolvedValue(2);
    mockPrisma.visit.findMany.mockResolvedValue([buildVisit(), buildVisit({ id: "visit-2", queueNumber: 2 })]);

    const res = await request(app).get("/api/visits").set("Cookie", `accessToken=${adminToken()}`);

    expect(res.status).toBe(200);
    const args = mockPrisma.visit.findMany.mock.calls[0]?.[0] as { orderBy: unknown };
    expect(args.orderBy).toEqual([{ queueNumber: "asc" }]);
  });

  it("200 riwayat pasien diurutkan terbaru dulu", async () => {
    mockPrisma.visit.count.mockResolvedValue(1);
    mockPrisma.visit.findMany.mockResolvedValue([buildVisit({ queueNumber: 5 })]);

    await request(app).get(`/api/visits?patientId=${PATIENT_ID}`).set("Cookie", `accessToken=${adminToken()}`);

    const args = mockPrisma.visit.findMany.mock.calls[0]?.[0] as { orderBy: unknown };
    expect(args.orderBy).toEqual([{ visitDate: "desc" }, { queueNumber: "desc" }]);
  });

  it("200 antrean harian tetap dibatasi tanggal hari ini", async () => {
    mockPrisma.visit.count.mockResolvedValue(0);
    mockPrisma.visit.findMany.mockResolvedValue([]);

    await request(app).get("/api/visits").set("Cookie", `accessToken=${adminToken()}`);

    const args = mockPrisma.visit.findMany.mock.calls[0]?.[0] as { where: { visitDate?: Date } };
    expect(args.where.visitDate?.toISOString()).toBe(`${wibDateString()}T00:00:00.000Z`);
  });

  it("200 riwayat pasien tidak dibatasi tanggal", async () => {
    mockPrisma.visit.count.mockResolvedValue(0);
    mockPrisma.visit.findMany.mockResolvedValue([]);

    await request(app).get(`/api/visits?patientId=${PATIENT_ID}`).set("Cookie", `accessToken=${adminToken()}`);

    const args = mockPrisma.visit.findMany.mock.calls[0]?.[0] as { where: { visitDate?: Date } };
    expect(args.where.visitDate).toBeUndefined();
  });

  it("200 riwayat pasien tetap bisa dibatasi tanggal tertentu", async () => {
    mockPrisma.visit.count.mockResolvedValue(0);
    mockPrisma.visit.findMany.mockResolvedValue([]);

    await request(app)
      .get(`/api/visits?patientId=${PATIENT_ID}&date=2026-10-01`)
      .set("Cookie", `accessToken=${adminToken()}`);

    const args = mockPrisma.visit.findMany.mock.calls[0]?.[0] as { where: { visitDate?: Date } };
    expect(args.where.visitDate?.toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });
});

describe("PATCH /api/visits/:id", () => {
  it("200 menandai sudah dilayani dan mengisi served_at", async () => {
    mockPrisma.visit.findFirst.mockResolvedValue({ id: VISIT_ID });
    mockPrisma.visit.update.mockResolvedValue(
      buildVisit({ status: "sudah_dilayani", servedAt: new Date("2026-10-16T03:00:00.000Z") }),
    );

    const res = await request(app)
      .patch(`/api/visits/${VISIT_ID}`)
      .set("Cookie", `accessToken=${adminToken()}`)
      .send({ status: "sudah_dilayani" });

    expect(res.status).toBe(200);
    const updateArgs = mockPrisma.visit.update.mock.calls[0]?.[0] as { data: { servedAt: Date | null } };
    expect(updateArgs.data.servedAt).toBeInstanceOf(Date);
    const body = res.body as DataEnvelope<{ servedAt: string }>;
    expect(body.data.servedAt).not.toBeNull();
  });

  it("200 membatalkan status dan mengosongkan served_at", async () => {
    mockPrisma.visit.findFirst.mockResolvedValue({ id: VISIT_ID });
    mockPrisma.visit.update.mockResolvedValue(buildVisit({ status: "belum_dilayani", servedAt: null }));

    const res = await request(app)
      .patch(`/api/visits/${VISIT_ID}`)
      .set("Cookie", `accessToken=${adminToken()}`)
      .send({ status: "belum_dilayani" });

    expect(res.status).toBe(200);
    const updateArgs = mockPrisma.visit.update.mock.calls[0]?.[0] as { data: { servedAt: Date | null } };
    expect(updateArgs.data.servedAt).toBeNull();
  });

  it("404 bila kunjungan tidak ditemukan", async () => {
    mockPrisma.visit.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .patch(`/api/visits/${VISIT_ID}`)
      .set("Cookie", `accessToken=${adminToken()}`)
      .send({ status: "sudah_dilayani" });
    expect(res.status).toBe(404);
  });

  it("422 bila tidak ada perubahan yang dikirim", async () => {
    const res = await request(app)
      .patch(`/api/visits/${VISIT_ID}`)
      .set("Cookie", `accessToken=${adminToken()}`)
      .send({});

    expect(res.status).toBe(422);
    expect(mockPrisma.visit.update).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/visits/:id", () => {
  it("200 melakukan soft delete", async () => {
    mockPrisma.visit.findFirst.mockResolvedValue({ id: VISIT_ID });
    mockPrisma.visit.update.mockResolvedValue(buildVisit({ deletedAt: new Date() }));

    const res = await request(app).delete(`/api/visits/${VISIT_ID}`).set("Cookie", `accessToken=${adminToken()}`);

    expect(res.status).toBe(200);
    const updateArgs = mockPrisma.visit.update.mock.calls[0]?.[0] as { data: { deletedAt: Date } };
    expect(updateArgs.data.deletedAt).toBeInstanceOf(Date);
  });
});
