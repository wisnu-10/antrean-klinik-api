import { AppError } from "./AppError";

// Semua tanggal antrean & nomor rekam medis memakai zona waktu WIB (Asia/Jakarta),
// sesuai keputusan D-04. WIB tidak memakai DST sehingga aman dihitung dari unix time.
const WIB_TIME_ZONE = "Asia/Jakarta";
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const WIB_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: WIB_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function pickPart(parts: Intl.DateTimeFormatPart[], type: string): string {
  return parts.find((part) => part.type === type)?.value ?? "";
}

/** Tanggal WIB saat ini/tertentu dalam format `YYYY-MM-DD`. */
export function wibDateString(date: Date = new Date()): string {
  const parts = WIB_DATE_FORMATTER.formatToParts(date);
  return `${pickPart(parts, "year")}-${pickPart(parts, "month")}-${pickPart(parts, "day")}`;
}

/** Tanggal WIB dalam format ringkas `YYYYMMDD` (untuk nomor rekam medis). */
export function wibCompactDate(date: Date = new Date()): string {
  return wibDateString(date).replaceAll("-", "");
}

export function isDateOnly(value: string): boolean {
  return DATE_ONLY_PATTERN.test(value);
}

/**
 * Mengubah string `YYYY-MM-DD` menjadi Date pada tengah malam UTC.
 * Kolom Prisma `@db.Date` menyimpan komponen tanggal saja, jadi UTC midnight
 * adalah representasi yang konsisten untuk filter `equals`.
 */
export function parseDateOnly(value: string): Date {
  if (!isDateOnly(value)) {
    throw new AppError("Format tanggal harus YYYY-MM-DD", 400);
  }
  const segments = value.split("-");
  const year = Number.parseInt(segments[0] ?? "", 10);
  const month = Number.parseInt(segments[1] ?? "", 10);
  const day = Number.parseInt(segments[2] ?? "", 10);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    throw new AppError("Format tanggal harus YYYY-MM-DD", 400);
  }
  const result = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(result.getTime())) {
    throw new AppError("Tanggal tidak valid", 400);
  }
  return result;
}

/** Date (kolom `@db.Date`) untuk tanggal WIB saat ini. */
export function wibDateOnly(date: Date = new Date()): Date {
  return parseDateOnly(wibDateString(date));
}

/** Representasi `YYYY-MM-DD` dari Date kolom `@db.Date`. */
export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
