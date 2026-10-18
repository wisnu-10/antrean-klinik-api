import type { CookieOptions } from "express";
import { env } from "./env";

export const AUTH_COOKIE_NAMES = {
  access: "accessToken",
  refresh: "refreshToken",
  role: "role",
} as const;

// Access token pendek (15 menit); refresh token panjang (7 hari).
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export const BCRYPT_ROUNDS = 12;

// Semua cookie auth httpOnly (middleware FE dibaca server-side, bukan JS browser).
export function baseCookieOptions(): CookieOptions {
  const isProduction = env.nodeEnv === "production";
  const options: CookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  };
  if (env.cookieDomain !== undefined) {
    options.domain = env.cookieDomain;
  }
  return options;
}
