import { AppError } from "./AppError";

/**
 * Menjamin nilai ditemukan sebelum dipakai. Melempar `AppError` bila null/undefined.
 * Dipakai untuk menggantikan blok `if (x === null) throw ...` yang berulang.
 */
export function requireFound<T>(value: T | null | undefined, message: string, statusCode = 404): T {
  if (value === null || value === undefined) {
    throw new AppError(message, statusCode);
  }
  return value;
}