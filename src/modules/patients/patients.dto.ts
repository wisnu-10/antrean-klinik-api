import type { Patient } from "../../../generated/prisma/client";
import { formatDateOnly } from "../../helpers/date";

export interface PatientDto {
  id: string;
  medicalRecord: string;
  name: string;
  placeBirth: string;
  dateBirth: string;
  address: string;
  createdAt: string;
}

type PatientDtoSource = Pick<
  Patient,
  "id" | "medicalRecord" | "name" | "placeBirth" | "dateBirth" | "address" | "createdAt"
>;

export function toPatientDto(patient: PatientDtoSource): PatientDto {
  return {
    id: patient.id,
    medicalRecord: patient.medicalRecord,
    name: patient.name,
    placeBirth: patient.placeBirth,
    dateBirth: formatDateOnly(patient.dateBirth),
    address: patient.address,
    createdAt: patient.createdAt.toISOString(),
  };
}
