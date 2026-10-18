import type { RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { env } from "../config/env";
import { AppError } from "../helpers/AppError";

export interface RateLimiterOptions {
  windowMs: number;
  limit: number;
  message: string;
}

// Membuat limiter per IP dengan envelope error standar (AppError + errorHandler).
export function createRateLimiter(options: RateLimiterOptions): RequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    // Header standar (RateLimit-*), tanpa header lawas X-RateLimit-*.
    standardHeaders: "draft-8",
    legacyHeaders: false,
    // Hanya percobaan yang gagal (status >= 400) yang dihitung, agar login
    // yang berhasil tidak menghabiskan kuota petugas.
    skipSuccessfulRequests: true,
    handler: (_req, _res, next) => {
      next(new AppError(options.message, 429));
    },
  });
}

export const loginLimiter = createRateLimiter({
  windowMs: env.rateLimitLoginWindowMs,
  limit: env.rateLimitLoginMax,
  message: "Terlalu banyak percobaan masuk. Coba lagi beberapa saat lagi.",
});
