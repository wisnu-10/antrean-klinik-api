import type { Prisma } from "../../../generated/prisma/client";
import { isDateOnly, parseDateOnly } from "../../helpers/date";
import { prisma } from "../../prisma";
import { pageSkip, paginated } from "../../helpers/pagination";
import { requireFound } from "../../helpers/assert";
import type { Paginated } from "../../types/api";
import { findPatientByIdentifier } from "./patientIdentifier";
import { createVisitInTransaction } from "../visits/visits.shared";
import { toPatientDto, type PatientDto } from "./patients.dto";
import type { CreatePatientBody, ListPatientsQuery, UpdatePatientBody } from "./validators/patients.validator";
import { createPatientInTransaction } from "./patients.shared";

function buildSearchFilters(query: ListPatientsQuery): Prisma.PatientWhereInput[] {
  const filters: Prisma.PatientWhereInput[] = [{ deletedAt: null }];

  if (query.rm !== undefined) {
    filters.push({ medicalRecord: { equals: query.rm, mode: "insensitive" } });
  }
  if (query.name !== undefined) {
    filters.push({ name: { contains: query.name, mode: "insensitive" } });
  }
  if (query.dob !== undefined) {
    filters.push({ dateBirth: parseDateOnly(query.dob) });
  }
  if (query.q !== undefined) {
    const or: Prisma.PatientWhereInput[] = [
      { medicalRecord: { equals: query.q, mode: "insensitive" } },
      { name: { contains: query.q, mode: "insensitive" } },
    ];
    if (isDateOnly(query.q)) {
      or.push({ dateBirth: parseDateOnly(query.q) });
    }
    filters.push({ OR: or });
  }

  return filters;
}

export async function listPatients(query: ListPatientsQuery): Promise<Paginated<PatientDto>> {
  const where: Prisma.PatientWhereInput = { AND: buildSearchFilters(query) };
  const skip = pageSkip(query.page, query.limit);

  const [total, patients] = await Promise.all([
    prisma.patient.count({ where }),
    prisma.patient.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit,
    }),
  ]);

  return paginated(patients.map((patient) => toPatientDto(patient)), total, query.page, query.limit);
}

export async function getPatient(identifier: string): Promise<PatientDto> {
  const patient = requireFound(await findPatientByIdentifier(prisma, identifier), "Pasien tidak ditemukan");
  return toPatientDto(patient);
}

export async function createPatient(input: CreatePatientBody, actorId: string): Promise<PatientDto> {
  const patient = await prisma.$transaction(async (tx) => {
    const created = await createPatientInTransaction(tx, {
      name: input.name,
      placeBirth: input.placeBirth,
      dateBirth: parseDateOnly(input.dateBirth),
      address: input.address,
    });

    if (input.complaint !== undefined) {
      await createVisitInTransaction(tx, {
        patientId: created.id,
        complaint: input.complaint,
        actorId,
      });
    }

    return created;
  });

  return toPatientDto(patient);
}

export async function updatePatient(id: string, input: UpdatePatientBody): Promise<PatientDto> {
  requireFound(await prisma.patient.findFirst({ where: { id, deletedAt: null } }), "Pasien tidak ditemukan");

  const data: Prisma.PatientUpdateInput = {};
  if (input.name !== undefined) {
    data.name = input.name;
  }
  if (input.placeBirth !== undefined) {
    data.placeBirth = input.placeBirth;
  }
  if (input.dateBirth !== undefined) {
    data.dateBirth = parseDateOnly(input.dateBirth);
  }
  if (input.address !== undefined) {
    data.address = input.address;
  }

  const patient = await prisma.patient.update({ where: { id }, data });
  return toPatientDto(patient);
}

export async function deletePatient(id: string): Promise<void> {
  requireFound(await prisma.patient.findFirst({ where: { id, deletedAt: null } }), "Pasien tidak ditemukan");
  await prisma.patient.update({ where: { id }, data: { deletedAt: new Date() } });
}
