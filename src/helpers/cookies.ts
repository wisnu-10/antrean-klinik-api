import type { Request, Response } from "express";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  AUTH_COOKIE_NAMES,
  REFRESH_TOKEN_TTL_SECONDS,
  baseCookieOptions,
} from "../config/auth";
import type { UserRole } from "../types/auth";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  role: UserRole;
}

export function getCookie(req: Request, name: string): string | undefined {
  const cookies = req.cookies as Record<string, unknown>;
  const value = cookies[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function setAccessCookie(res: Response, accessToken: string): void {
  res.cookie(AUTH_COOKIE_NAMES.access, accessToken, {
    ...baseCookieOptions(),
    maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
  });
}

export function setAuthCookies(res: Response, tokens: AuthTokens): void {
  setAccessCookie(res, tokens.accessToken);
  const sessionMaxAge = REFRESH_TOKEN_TTL_SECONDS * 1000;
  res.cookie(AUTH_COOKIE_NAMES.refresh, tokens.refreshToken, {
    ...baseCookieOptions(),
    maxAge: sessionMaxAge,
  });
  res.cookie(AUTH_COOKIE_NAMES.role, tokens.role, {
    ...baseCookieOptions(),
    maxAge: sessionMaxAge,
  });
}

export function clearAuthCookies(res: Response): void {
  const base = baseCookieOptions();
  res.clearCookie(AUTH_COOKIE_NAMES.access, base);
  res.clearCookie(AUTH_COOKIE_NAMES.refresh, base);
  res.clearCookie(AUTH_COOKIE_NAMES.role, base);
}
