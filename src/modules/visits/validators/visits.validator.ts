import { z } from "zod";
import {
  addressSchema,
  complaintSchema,
  dateOnlySchema,
  liveDateOnlySchema,
  nameSchema,
  placeBirthSchema,
} from "../../common/validators";

export const visitIdParamSchema = z.object({
  id: z.uuid("ID kunjungan tidak valid"),
});

const newPatientSchema = z.strictObject({
  name: nameSchema,
  placeBirth: placeBirthSchema,
  dateBirth: liveDateOnlySchema,
  address: addressSchema,
});

export const listVisitsQuerySchema = z.strictObject({
  date: dateOnlySchema.optional(),
  status: z.enum(["belum_dilayani", "sudah_dilayani"]).optional(),
  patientId: z.uuid("ID pasien tidak valid").optional(),
  page: z.coerce.number().int("Halaman harus bilangan bulat").min(1, "Halaman minimal 1").default(1),
  limit: z.coerce.number().int("Limit harus bilangan bulat").min(1).max(100).default(50),
});

export const createVisitSchema = z
  .strictObject({
    patientId: z.uuid("ID pasien tidak valid").optional(),
    newPatient: newPatientSchema.optional(),
    complaint: complaintSchema,
  })
  .refine((data) => (data.patientId !== undefined) !== (data.newPatient !== undefined), {
    message: "Pilih pasien terdaftar atau isi data pasien baru (salah satu saja)",
    path: ["patientId"],
  });

export const updateVisitSchema = z
  .strictObject({
    status: z.enum(["belum_dilayani", "sudah_dilayani"]).optional(),
    complaint: z.string().trim().min(1, "Keluhan minimal 1 karakter").max(1000).optional(),
  })
  .refine((data) => data.status !== undefined || data.complaint !== undefined, {
    message: "Tidak ada perubahan yang dikirim",
  });

export type ListVisitsQuery = z.infer<typeof listVisitsQuerySchema>;
export type CreateVisitBody = z.infer<typeof createVisitSchema>;
export type UpdateVisitBody = z.infer<typeof updateVisitSchema>;
export type NewPatientBody = z.infer<typeof newPatientSchema>;
