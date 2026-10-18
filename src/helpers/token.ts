import jwt, { type JwtPayload } from "jsonwebtoken";
import { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS } from "../config/auth";
import { env } from "../config/env";
import type { UserRole } from "../types/auth";
import { AppError } from "./AppError";

export interface AccessTokenPayload {
  sub: string;
  username: string;
  role: UserRole;
}

export interface RefreshTokenPayload {
  sub: string;
}

const INVALID_SESSION_MESSAGE = "Sesi tidak valid atau sudah berakhir";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isUserRole(value: unknown): value is UserRole {
  return value === "superadmin" || value === "admin";
}

function decode(token: string, secret: string): Record<string, unknown> {
  let decoded: string | JwtPayload;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    throw new AppError(INVALID_SESSION_MESSAGE, 401);
  }
  if (!isRecord(decoded)) {
    throw new AppError(INVALID_SESSION_MESSAGE, 401);
  }
  return decoded;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: REFRESH_TOKEN_TTL_SECONDS });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = decode(token, env.jwtAccessSecret);
  const { sub, username, role } = decoded;
  if (typeof sub !== "string" || typeof username !== "string" || !isUserRole(role)) {
    throw new AppError(INVALID_SESSION_MESSAGE, 401);
  }
  return { sub, username, role };
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = decode(token, env.jwtRefreshSecret);
  const { sub } = decoded;
  if (typeof sub !== "string") {
    throw new AppError(INVALID_SESSION_MESSAGE, 401);
  }
  return { sub };
}
