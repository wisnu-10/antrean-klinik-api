import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Patient } from "../generated/prisma/client";
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
    patient: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
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

function adminToken(): string {
  return signAccessToken({ sub: ADMIN_ID, username: "admin1", role: "admin" });
}

function superadminToken(): string {
  return signAccessToken({ sub: SUPERADMIN_ID, username: "superadmin", role: "superadmin" });
}

function buildPatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: PATIENT_ID,
    medicalRecord: "RM-20261016-0001",
    name: "Budi Santoso",
    placeBirth: "Bandung",
    dateBirth: new Date("1990-05-10T00:00:00.000Z"),
    address: "Jl. Merdeka No. 1",
    createdAt: new Date("2026-10-16T02:00:00.000Z"),
    updatedAt: new Date("2026-10-16T02:00:00.000Z"),
    deletedAt: null,
    ...overrides,
  };
}

function todayPrefix(): string {
  return `RM-${wibDateString().replaceAll("-", "")}-`;
}

beforeEach(() => {
  vi.resetAllMocks();
  mockPrisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
  tx.$executeRaw.mockResolvedValue(1);
});

describe("guard /api/patients", () => {
  it("401 tanpa token", async () => {
    const res = await request(app).get("/api/patients");
    expect(res.status).toBe(401);
  });

  it("403 untuk superadmin", async () => {
    const res = await request(app).get("/api/patients").set("Cookie", `accessToken=${superadminToken()}`);
    expect(res.status).toBe(403);
  });
});

describe("GET /api/patients", () => {
  it("200 mengembalikan daftar berpaginasi", async () => {
    mockPrisma.patient.count.mockResolvedValue(1);
    mockPrisma.patient.findMany.mockResolvedValue([buildPatient()]);

    const res = await request(app).get("/api/patients?page=1&limit=10").set("Cookie", `accessToken=${adminToken()}`);

    expect(res.status).toBe(200);
    const body = res.body as DataEnvelope<{ items: Patient[]; total: number; page: number; limit: number }>;
    expect(body.data.total).toBe(1);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0]?.medicalRecord).toBe("RM-20261016-0001");
    const first = mockPrisma.patient.findMany.mock.calls[0]?.[0] as { skip: number; take: number } | undefined;
    expect(first?.skip).toBe(0);
    expect(first?.take).toBe(10);
  });

  it("membangun filter pencarian gabungan (rm/name/dob/q)", async () => {
    mockPrisma.patient.count.mockResolvedValue(0);
    mockPrisma.patient.findMany.mockResolvedValue([]);

    await request(app)
      .get("/api/patients?name=budi&rm=RM-20261016-0001&dob=1990-05-10&q=santoso")
      .set("Cookie", `accessToken=${adminToken()}`);

    const call = mockPrisma.patient.findMany.mock.calls[0]?.[0] as { where: { AND: unknown[] } };
    expect(call.where.AND).toHaveLength(5);
  });

  it("422 bila limit di luar batas", async () => {
    const res = await request(app).get("/api/patients?limit=999").set("Cookie", `accessToken=${adminToken()}`);
    expect(res.status).toBe(422);
    expect(mockPrisma.patient.findMany).not.toHaveBeenCalled();
  });

  it("422 bila ada query asing (strict)", async () => {
    const res = await request(app).get("/api/patients?sort=name").set("Cookie", `accessToken=${adminToken()}`);
    expect(res.status).toBe(422);
    expect(mockPrisma.patient.findMany).not.toHaveBeenCalled();
  });
});

describe("POST /api/patients", () => {
  it("201 membuat pasien dengan nomor RM berurutan", async () => {
    tx.patient.findFirst.mockResolvedValue(buildPatient({ medicalRecord: `${todayPrefix()}0007` }));
    tx.patient.create.mockImplementation((args: { data: { medicalRecord: string } }) =>
      Promise.resolve(buildPatient({ medicalRecord: args.data.medicalRecord })),
    );

    const res = await request(app)
      .post("/api/patients")
      .set("Cookie", `accessToken=${adminToken()}`)
      .send({
        name: "Budi Santoso",
        placeBirth: "Bandung",
        dateBirth: "1990-05-10",
        address: "Jl. Merdeka No. 1",
      });

    expect(res.status).toBe(201);
    const createArgs = tx.patient.create.mock.calls[0]?.[0] as { data: { medicalRecord: string } };
    expect(createArgs.data.medicalRecord).toBe(`${todayPrefix()}0008`);
    expect(tx.visit.create).not.toHaveBeenCalled();
  });

  it("201 membuat pasien sekaligus kunjungan pertama bila keluhan diisi", async () => {
    tx.patient.findFirst.mockResolvedValue(null);
    tx.patient.create.mockResolvedValue(buildPatient({ medicalRecord: `${todayPrefix()}0001` }));
    tx.visit.findFirst.mockResolvedValue(null);
    tx.visit.create.mockResolvedValue({ id: "visit-1" });

    const res = await request(app)
      .post("/api/patients")
      .set("Cookie", `accessToken=${adminToken()}`)
      .send({
        name: "Budi Santoso",
        placeBirth: "Bandung",
        dateBirth: "1990-05-10",
        address: "Jl. Merdeka No. 1",
        complaint: "Demam sejak kemarin",
      });

    expect(res.status).toBe(201);
    const visitArgs = tx.visit.create.mock.calls[0]?.[0] as { data: { complaint: string; queueNumber: number } };
    expect(visitArgs.data.complaint).toBe("Demam sejak kemarin");
    expect(visitArgs.data.queueNumber).toBe(1);
  });

  it("422 bila tanggal lahir di masa depan", async () => {
    const res = await request(app)
      .post("/api/patients")
      .set("Cookie", `accessToken=${adminToken()}`)
      .send({
        name: "Budi",
        placeBirth: "Bandung",
        dateBirth: "2999-01-01",
        address: "Jl. Merdeka",
      });

    expect(res.status).toBe(422);
    expect(tx.patient.create).not.toHaveBeenCalled();
  });

  it("422 bila ada field asing (strict)", async () => {
    const res = await request(app)
      .post("/api/patients")
      .set("Cookie", `accessToken=${adminToken()}`)
      .send({
        name: "Budi",
        placeBirth: "Bandung",
        dateBirth: "1990-05-10",
        address: "Jl. Merdeka",
        medicalRecord: "RM-20260101-9999",
      });

    expect(res.status).toBe(422);
    expect(tx.patient.create).not.toHaveBeenCalled();
  });
});

describe("GET /api/patients/:identifier", () => {
  it("200 mengambil detail berdasarkan UUID (tautan lama) & mengirim filter id", async () => {
    mockPrisma.patient.findFirst.mockResolvedValue(buildPatient());

    const res = await request(app).get(`/api/patients/${PATIENT_ID}`).set("Cookie", `accessToken=${adminToken()}`);

    expect(res.status).toBe(200);
    const args = mockPrisma.patient.findFirst.mock.calls[0]?.[0] as { where: { id?: string } };
    expect(args.where.id).toBe(PATIENT_ID);
  });

  it("200 mengambil detail berdasarkan nomor rekam medis", async () => {
    mockPrisma.patient.findFirst.mockResolvedValue(buildPatient());

    const res = await request(app)
      .get("/api/patients/rm-20261016-0001")
      .set("Cookie", `accessToken=${adminToken()}`);

    expect(res.status).toBe(200);
    const args = mockPrisma.patient.findFirst.mock.calls[0]?.[0] as { where: { medicalRecord?: string } };
    expect(args.where.medicalRecord).toBe("RM-20261016-0001");
  });

  it("200 mengambil detail berdasarkan slug nama + RM", async () => {
    mockPrisma.patient.findFirst.mockResolvedValue(buildPatient());

    const res = await request(app)
      .get("/api/patients/budi-santoso-rm-20261016-0001")
      .set("Cookie", `accessToken=${adminToken()}`);

    expect(res.status).toBe(200);
    const args = mockPrisma.patient.findFirst.mock.calls[0]?.[0] as { where: { medicalRecord?: string } };
    expect(args.where.medicalRecord).toBe("RM-20261016-0001");
  });

  it("404 tanpa menyentuh DB bila identifier tidak dikenali", async () => {
    const res = await request(app)
      .get("/api/patients/bukan-identifier")
      .set("Cookie", `accessToken=${adminToken()}`);

    expect(res.status).toBe(404);
    expect(mockPrisma.patient.findFirst).not.toHaveBeenCalled();
  });

  it("404 bila pasien tidak ada / terhapus", async () => {
    mockPrisma.patient.findFirst.mockResolvedValue(null);
    const res = await request(app).get(`/api/patients/${PATIENT_ID}`).set("Cookie", `accessToken=${adminToken()}`);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/patients/:id", () => {
  it("200 memperbarui data pasien", async () => {
    mockPrisma.patient.findFirst.mockResolvedValue(buildPatient());
    mockPrisma.patient.update.mockResolvedValue(buildPatient({ name: "Budi Baru" }));

    const res = await request(app)
      .patch(`/api/patients/${PATIENT_ID}`)
      .set("Cookie", `accessToken=${adminToken()}`)
      .send({ name: "Budi Baru" });

    expect(res.status).toBe(200);
    const body = res.body as DataEnvelope<Patient>;
    expect(body.data.name).toBe("Budi Baru");
  });
});

describe("DELETE /api/patients/:id", () => {
  it("200 melakukan soft delete", async () => {
    mockPrisma.patient.findFirst.mockResolvedValue(buildPatient());
    mockPrisma.patient.update.mockResolvedValue(buildPatient({ deletedAt: new Date() }));

    const res = await request(app).delete(`/api/patients/${PATIENT_ID}`).set("Cookie", `accessToken=${adminToken()}`);

    expect(res.status).toBe(200);
    const updateArgs = mockPrisma.patient.update.mock.calls[0]?.[0] as { data: { deletedAt: Date } };
    expect(updateArgs.data.deletedAt).toBeInstanceOf(Date);
  });
});
