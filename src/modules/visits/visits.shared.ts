import type { Prisma, Visit } from "../../../generated/prisma/client";
import { AppError } from "../../helpers/AppError";
import { formatDateOnly, wibDateOnly } from "../../helpers/date";
import { createPatientInTransaction, type PatientCoreInput } from "../patients/patients.shared";

/**
 * Mengalokasikan nomor antrean berikutnya untuk `visitDate`.
 * Advisory lock transaksional per-tanggal men-serialisasi alokasi sehingga
 * permintaan paralel tidak menghasilkan nomor ganda. Nomor dihitung dari
 * semua baris (termasuk soft-deleted) agar tidak pernah dipakai ulang.
 */
export async function nextQueueNumber(tx: Prisma.TransactionClient, visitDate: Date): Promise<number> {
  const lockKey = `visit-queue:${formatDateOnly(visitDate)}`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

  const last = await tx.visit.findFirst({
    where: { visitDate },
    orderBy: { queueNumber: "desc" },
    select: { queueNumber: true },
  });
  return (last?.queueNumber ?? 0) + 1;
}

export interface CreateVisitCoreInput {
  complaint: string;
  actorId: string;
  patientId?: string | undefined;
  newPatient?: PatientCoreInput | undefined;
  now?: Date | undefined;
}

/**
 * Membuat kunjungan di dalam transaksi berjalan. Bila `patientId` tidak diisi,
 * `newPatient` wajib diisi dan pasien dibuat lebih dulu (alokasi nomor RM).
 */
export async function createVisitInTransaction(
  tx: Prisma.TransactionClient,
  input: CreateVisitCoreInput,
): Promise<Visit> {
  const now = input.now ?? new Date();
  const visitDate = wibDateOnly(now);

  let patientId = input.patientId;
  if (patientId === undefined) {
    if (input.newPatient === undefined) {
      throw new AppError("Pasien wajib dipilih", 400);
    }
    const patient = await createPatientInTransaction(tx, input.newPatient, now);
    patientId = patient.id;
  }

  const queueNumber = await nextQueueNumber(tx, visitDate);
  return tx.visit.create({
    data: {
      patientId,
      registeredBy: input.actorId,
      visitDate,
      queueNumber,
      complaint: input.complaint,
    },
  });
}
