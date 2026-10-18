import type { Request, Response } from "express";
import { requireRouteParam } from "../../helpers/request";
import { ok } from "../../helpers/respond";
import { requireUser } from "../../middlewares/auth";
import * as usersService from "./users.service";
import type { CreateUserBody, ResetPasswordBody, UpdateUserBody } from "./validators/users.validator";

export async function listUsersHandler(_req: Request, res: Response): Promise<void> {
  const items = await usersService.listUsers();
  ok(res, "Daftar user", items);
}

export async function createUserHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateUserBody;
  const user = await usersService.createUser(body);
  ok(res, "User berhasil dibuat", user, 201);
}

export async function updateUserHandler(req: Request, res: Response): Promise<void> {
  const id = requireRouteParam(req, "id");
  const actor = requireUser(req);
  const body = req.body as UpdateUserBody;
  const user = await usersService.updateUser(id, body, actor.id);
  ok(res, "User berhasil diperbarui", user);
}

export async function resetPasswordHandler(req: Request, res: Response): Promise<void> {
  const id = requireRouteParam(req, "id");
  const body = req.body as ResetPasswordBody;
  await usersService.resetPassword(id, body);
  ok(res, "Password berhasil direset");
}

export async function deactivateUserHandler(req: Request, res: Response): Promise<void> {
  const id = requireRouteParam(req, "id");
  const actor = requireUser(req);
  await usersService.deactivateUser(id, actor.id);
  ok(res, "User berhasil dinonaktifkan");
}
