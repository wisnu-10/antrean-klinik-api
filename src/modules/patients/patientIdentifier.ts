import type { Patient, Prisma } from "../../../generated/prisma/client";

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MEDICAL_RECORD_PATTERN = /\bRM-\d{8}-\d{4}\b/i;

export interface PatientLookupClient {
  patient: {
    findFirst(args: Prisma.PatientFindFirstArgs): Promise<Patient | null>;
  };
}

/**
 * Resolusi identifier pasien untuk URL detail:
 * - UUID  -> cari berdasarkan `id` (kompatibel dengan tautan lama)
 * - slug memuat `RM-YYYYMMDD-NNNN` -> cari berdasarkan `medicalRecord`
 *   (bagian nama pada slug hanya kosmetik, jadi tautan tetap valid walau nama berubah)
 */
export async function findPatientByIdentifier(
  client: PatientLookupClient,
  identifier: string,
): Promise<Patient | null> {
  if (UUID_PATTERN.test(identifier)) {
    return client.patient.findFirst({ where: { id: identifier, deletedAt: null } });
  }

  const match = MEDICAL_RECORD_PATTERN.exec(identifier);
  if (match === null) {
    return null;
  }
  return client.patient.findFirst({
    where: { medicalRecord: match[0].toUpperCase(), deletedAt: null },
  });
}