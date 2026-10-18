import { z } from "zod";
import { wibDateString } from "../../helpers/date";

export const dateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD");

export const liveDateOnlySchema = dateOnlySchema.refine(
  (value) => value <= wibDateString(),
  "Tanggal lahir tidak boleh di masa depan",
);

export const nameSchema = z.string().trim().min(1, "Nama wajib diisi").max(100, "Nama maksimal 100 karakter");

export const placeBirthSchema = z
  .string()
  .trim()
  .min(1, "Tempat lahir wajib diisi")
  .max(100, "Tempat lahir maksimal 100 karakter");

export const addressSchema = z
  .string()
  .trim()
  .min(1, "Alamat wajib diisi")
  .max(1000, "Alamat maksimal 1000 karakter");

export const complaintSchema = z
  .string()
  .trim()
  .min(1, "Keluhan wajib diisi")
  .max(1000, "Keluhan maksimal 1000 karakter");

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username minimal 3 karakter")
  .max(50, "Username maksimal 50 karakter");

export const passwordSchema = z.string().min(8, "Password minimal 8 karakter").max(100, "Password maksimal 100 karakter");

export function atLeastOne<T extends Record<string, unknown>>(keys: (keyof T)[]) {
  return (data: T): boolean => keys.some((key) => data[key] !== undefined);
}
