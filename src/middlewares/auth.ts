import type { NextFunction, Request, RequestHandler, Response } from "express";
import { AUTH_COOKIE_NAMES } from "../config/auth";
import { AppError } from "../helpers/AppError";
import { getCookie } from "../helpers/cookies";
import { verifyAccessToken } from "../helpers/token";
import type { AuthUser, UserRole } from "../types/auth";

export function jwtVerify(req: Request, _res: Response, next: NextFunction): void {
  const token = getCookie(req, AUTH_COOKIE_NAMES.access);
  if (token === undefined) {
    next(new AppError("Tidak terautentikasi", 401));
    return;
  }
  const payload = verifyAccessToken(token);
  req.user = { id: payload.sub, username: payload.username, role: payload.role };
  next();
}

export function roleverify(roles: readonly UserRole[]): RequestHandler {
  const allowed = new Set<UserRole>(roles);
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;
    if (user === undefined) {
      next(new AppError("Tidak terautentikasi", 401));
      return;
    }
    if (!allowed.has(user.role)) {
      next(new AppError("Akses ditolak", 403));
      return;
    }
    next();
  };
}

export function requireUser(req: Request): AuthUser {
  const user = req.user;
  if (user === undefined) {
    throw new AppError("Tidak terautentikasi", 401);
  }
  return user;
}
