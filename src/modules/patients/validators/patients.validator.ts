import { z } from "zod";
import {
  addressSchema,
  dateOnlySchema,
  liveDateOnlySchema,
  nameSchema,
  placeBirthSchema,
} from "../../common/validators";

export const patientIdParamSchema = z.object({
  id: z.uuid("ID pasien tidak valid"),
});

// Untuk GET detail: menerima UUID maupun slug ramah-URL
// (mis. `budi-santoso-rm-20261016-0001` atau `rm-20261016-0001`).
// Resolusi identifier dilakukan di service; di sini hanya validasi bentuk.
export const patientIdentifierParamSchema = z.object({
  id: z.string().trim().min(1, "Identifier pasien wajib diisi").max(150, "Identifier terlalu panjang"),
});

const patientFields = {
  name: nameSchema,
  placeBirth: placeBirthSchema,
  dateBirth: liveDateOnlySchema,
  address: addressSchema,
};

export const createPatientSchema = z.strictObject({
  ...patientFields,
  complaint: z
    .string()
    .trim()
    .min(1, "Keluhan minimal 1 karakter")
    .max(1000, "Keluhan maksimal 1000 karakter")
    .optional(),
});

export const updatePatientSchema = z
  .strictObject({
    name: patientFields.name.optional(),
    placeBirth: patientFields.placeBirth.optional(),
    dateBirth: dateOnlySchema.optional(),
    address: patientFields.address.optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.placeBirth !== undefined ||
      data.dateBirth !== undefined ||
      data.address !== undefined,
    { message: "Tidak ada perubahan yang dikirim" },
  );

export const listPatientsQuerySchema = z.strictObject({
  q: z.string().trim().min(1, "Kata kunci tidak boleh kosong").max(100).optional(),
  rm: z.string().trim().min(1).max(20).optional(),
  name: z.string().trim().min(1).max(100).optional(),
  dob: dateOnlySchema.optional(),
  page: z.coerce.number().int("Halaman harus bilangan bulat").min(1, "Halaman minimal 1").default(1),
  limit: z.coerce.number().int("Limit harus bilangan bulat").min(1).max(100).default(20),
});

export type CreatePatientBody = z.infer<typeof createPatientSchema>;
export type UpdatePatientBody = z.infer<typeof updatePatientSchema>;
export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>;
