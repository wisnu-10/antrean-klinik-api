import type { Prisma } from "../../../generated/prisma/client";
import { parseDateOnly, wibDateOnly } from "../../helpers/date";
import { prisma } from "../../prisma";
import { pageSkip, paginated } from "../../helpers/pagination";
import { requireFound } from "../../helpers/assert";
import type { Paginated } from "../../types/api";
import type { PatientCoreInput } from "../patients/patients.shared";
import { toVisitDto, type VisitDto } from "./visits.dto";
import { createVisitInTransaction } from "./visits.shared";
import type { CreateVisitBody, ListVisitsQuery, UpdateVisitBody } from "./validators/visits.validator";

const PATIENT_SELECT = { id: true, medicalRecord: true, name: true } as const;

export async function listVisits(query: ListVisitsQuery): Promise<Paginated<VisitDto>> {
  const where: Prisma.VisitWhereInput = {
    deletedAt: null,
  };
  // Antrean harian (tanpa patientId) dibatasi hari ini; riwayat pasien bersifat lintas tanggal.
  // `date` eksplisit selalu menang untuk kedua mode.
  if (query.date !== undefined) {
    where.visitDate = parseDateOnly(query.date);
  } else if (query.patientId === undefined) {
    where.visitDate = wibDateOnly();
  }
  if (query.status !== undefined) {
    where.status = query.status;
  }
  if (query.patientId !== undefined) {
    where.patientId = query.patientId;
  }

  // Antrean harian: FIFO (queue_number naik). Riwayat per pasien: terbaru dulu.
  const orderBy: Prisma.VisitOrderByWithRelationInput[] =
    query.patientId !== undefined
      ? [{ visitDate: "desc" }, { queueNumber: "desc" }]
      : [{ queueNumber: "asc" }];

  const skip = pageSkip(query.page, query.limit);
  const [total, visits] = await Promise.all([
    prisma.visit.count({ where }),
    prisma.visit.findMany({
      where,
      orderBy,
      skip,
      take: query.limit,
      include: { patient: { select: PATIENT_SELECT } },
    }),
  ]);

  return paginated(visits.map((visit) => toVisitDto(visit)), total, query.page, query.limit);
}

export async function getVisit(id: string): Promise<VisitDto> {
  const visit = requireFound(
    await prisma.visit.findFirst({
      where: { id, deletedAt: null },
      include: { patient: { select: PATIENT_SELECT } },
    }),
    "Kunjungan tidak ditemukan",
  );
  return toVisitDto(visit);
}

export async function createVisit(body: CreateVisitBody, actorId: string): Promise<VisitDto> {
  const created = await prisma.$transaction(async (tx) => {
    if (body.patientId !== undefined) {
      requireFound(
        await tx.patient.findFirst({
          where: { id: body.patientId, deletedAt: null },
          select: { id: true },
        }),
        "Pasien tidak ditemukan",
      );
    }

    const newPatient: PatientCoreInput | undefined =
      body.newPatient === undefined
        ? undefined
        : {
            name: body.newPatient.name,
            placeBirth: body.newPatient.placeBirth,
            dateBirth: parseDateOnly(body.newPatient.dateBirth),
            address: body.newPatient.address,
          };

    return createVisitInTransaction(tx, {
      patientId: body.patientId,
      newPatient,
      complaint: body.complaint,
      actorId,
    });
  });

  return getVisit(created.id);
}

export async function updateVisit(id: string, body: UpdateVisitBody): Promise<VisitDto> {
  requireFound(await prisma.visit.findFirst({ where: { id, deletedAt: null }, select: { id: true } }), "Kunjungan tidak ditemukan");

  const data: Prisma.VisitUpdateInput = {};
  if (body.complaint !== undefined) {
    data.complaint = body.complaint;
  }
  if (body.status !== undefined) {
    data.status = body.status;
    data.servedAt = body.status === "sudah_dilayani" ? new Date() : null;
  }

  const visit = await prisma.visit.update({
    where: { id },
    data,
    include: { patient: { select: PATIENT_SELECT } },
  });
  return toVisitDto(visit);
}

export async function deleteVisit(id: string): Promise<void> {
  requireFound(await prisma.visit.findFirst({ where: { id, deletedAt: null }, select: { id: true } }), "Kunjungan tidak ditemukan");
  await prisma.visit.update({ where: { id }, data: { deletedAt: new Date() } });
}
