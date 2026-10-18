import type { Patient, Prisma } from "../../../generated/prisma/client";
import { wibCompactDate } from "../../helpers/date";

export interface PatientCoreInput {
  name: string;
  placeBirth: string;
  dateBirth: Date;
  address: string;
}

/**
 * Membuat nomor rekam medis berikutnya untuk tanggal tertentu.
 * Memakai advisory lock transaksional per-tanggal supaya dua permintaan
 * paralel tidak menghasilkan nomor yang sama. Nomor dihitung dari baris
 * yang masih ada (termasuk soft-deleted) agar tidak pernah dipakai ulang.
 */
export async function nextMedicalRecord(tx: Prisma.TransactionClient, now: Date): Promise<string> {
  const prefix = `RM-${wibCompactDate(now)}-`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${prefix}))`;

  const last = await tx.patient.findFirst({
    where: { medicalRecord: { startsWith: prefix } },
    orderBy: { medicalRecord: "desc" },
    select: { medicalRecord: true },
  });

  let next = 1;
  if (last !== null) {
    const parsed = Number.parseInt(last.medicalRecord.slice(prefix.length), 10);
    if (!Number.isNaN(parsed)) {
      next = parsed + 1;
    }
  }
  return `${prefix}${next.toString().padStart(4, "0")}`;
}

/** Membuat pasien di dalam transaksi yang sudah berjalan (alokasi nomor RM aman). */
export async function createPatientInTransaction(
  tx: Prisma.TransactionClient,
  input: PatientCoreInput,
  now: Date = new Date(),
): Promise<Patient> {
  const medicalRecord = await nextMedicalRecord(tx, now);
  return tx.patient.create({
    data: {
      medicalRecord,
      name: input.name,
      placeBirth: input.placeBirth,
      dateBirth: input.dateBirth,
      address: input.address,
    },
  });
}
