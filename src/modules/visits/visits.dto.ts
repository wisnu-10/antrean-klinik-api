import type { Visit, VisitStatus } from "../../../generated/prisma/client";
import { formatDateOnly } from "../../helpers/date";

export interface VisitPatientSummary {
  id: string;
  medicalRecord: string;
  name: string;
}

export interface VisitDto {
  id: string;
  patientId: string;
  queueNumber: number;
  visitDate: string;
  complaint: string;
  status: VisitStatus;
  servedAt: string | null;
  createdAt: string;
  registeredBy: string;
  patient: VisitPatientSummary;
}

export interface VisitWithPatient extends Visit {
  patient: VisitPatientSummary;
}

export function toVisitDto(visit: VisitWithPatient): VisitDto {
  return {
    id: visit.id,
    patientId: visit.patientId,
    queueNumber: visit.queueNumber,
    visitDate: formatDateOnly(visit.visitDate),
    complaint: visit.complaint,
    status: visit.status,
    servedAt: visit.servedAt === null ? null : visit.servedAt.toISOString(),
    createdAt: visit.createdAt.toISOString(),
    registeredBy: visit.registeredBy,
    patient: {
      id: visit.patient.id,
      medicalRecord: visit.patient.medicalRecord,
      name: visit.patient.name,
    },
  };
}
