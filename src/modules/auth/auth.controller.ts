import type { Request, Response } from "express";
import { AUTH_COOKIE_NAMES } from "../../config/auth";
import { AppError } from "../../helpers/AppError";
import { clearAuthCookies, getCookie, setAccessCookie, setAuthCookies } from "../../helpers/cookies";
import { ok } from "../../helpers/respond";
import { requireUser } from "../../middlewares/auth";
import * as authService from "./auth.service";
import type { ChangePasswordBody, LoginBody } from "./validators/auth.validator";

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as LoginBody;
  const { user, tokens } = await authService.login(body.username, body.password);
  setAuthCookies(res, tokens);
  ok(res, "Login berhasil", { user });
}

export function logoutHandler(_req: Request, res: Response): void {
  clearAuthCookies(res);
  ok(res, "Logout berhasil");
}

export async function meHandler(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const current = await authService.getCurrentUser(user.id);
  ok(res, "Sesi aktif", { user: current });
}

export async function refreshHandler(req: Request, res: Response): Promise<void> {
  const token = getCookie(req, AUTH_COOKIE_NAMES.refresh);
  if (token === undefined) {
    throw new AppError("Refresh token tidak ditemukan", 401);
  }
  const { user, accessToken } = await authService.refresh(token);
  setAccessCookie(res, accessToken);
  ok(res, "Sesi diperbarui", { user });
}

export async function changePasswordHandler(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.body as ChangePasswordBody;
  await authService.changePassword(user.id, body);
  ok(res, "Password berhasil diubah");
}
