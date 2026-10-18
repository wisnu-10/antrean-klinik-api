import { AppError } from "../../helpers/AppError";
import { hashPassword } from "../../helpers/password";
import { requireFound } from "../../helpers/assert";
import { prisma } from "../../prisma";
import { toUserDto, type UserDto } from "./users.dto";
import type { CreateUserBody, ResetPasswordBody, UpdateUserBody } from "./validators/users.validator";

export async function listUsers(): Promise<UserDto[]> {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  return users.map((user) => toUserDto(user));
}

export async function createUser(input: CreateUserBody): Promise<UserDto> {
  const existing = await prisma.user.findUnique({ where: { username: input.username } });
  if (existing !== null) {
    throw new AppError("Username sudah digunakan", 409);
  }
  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      username: input.username,
      nama: input.nama,
      passwordHash,
      role: "admin",
    },
  });
  return toUserDto(user);
}

export async function updateUser(id: string, input: UpdateUserBody, actorId: string): Promise<UserDto> {
  const target = requireFound(await prisma.user.findUnique({ where: { id } }), "User tidak ditemukan");
  if (input.username !== undefined && input.username !== target.username) {
    const conflict = await prisma.user.findUnique({ where: { username: input.username } });
    if (conflict !== null) {
      throw new AppError("Username sudah digunakan", 409);
    }
  }
  if (input.isActive === false && id === actorId) {
    throw new AppError("Tidak dapat menonaktifkan akun sendiri", 400);
  }
  const data: { username?: string; nama?: string; isActive?: boolean } = {};
  if (input.username !== undefined) {
    data.username = input.username;
  }
  if (input.nama !== undefined) {
    data.nama = input.nama;
  }
  if (input.isActive !== undefined) {
    data.isActive = input.isActive;
  }
  const user = await prisma.user.update({ where: { id }, data });
  return toUserDto(user);
}

export async function resetPassword(id: string, input: ResetPasswordBody): Promise<void> {
  requireFound(await prisma.user.findUnique({ where: { id } }), "User tidak ditemukan");
  const passwordHash = await hashPassword(input.newPassword);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
}

export async function deactivateUser(id: string, actorId: string): Promise<void> {
  if (id === actorId) {
    throw new AppError("Tidak dapat menonaktifkan akun sendiri", 400);
  }
  requireFound(await prisma.user.findUnique({ where: { id } }), "User tidak ditemukan");
  await prisma.user.update({ where: { id }, data: { isActive: false } });
}
