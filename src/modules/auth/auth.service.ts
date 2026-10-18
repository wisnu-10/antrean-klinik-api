import type { AuthTokens } from "../../helpers/cookies";
import { AppError } from "../../helpers/AppError";
import { hashPassword, verifyPassword } from "../../helpers/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../helpers/token";
import { prisma } from "../../prisma";
import type { UserRole } from "../../types/auth";
import type { User } from "../../../generated/prisma/client";
import { toUserDto, type UserDto } from "../users/users.dto";
import type { ChangePasswordBody } from "./validators/auth.validator";

const INVALID_CREDENTIALS_MESSAGE = "Username atau password salah";
const INVALID_SESSION_MESSAGE = "Sesi tidak valid atau sudah berakhir";

interface TokenSubject {
  id: string;
  username: string;
  role: UserRole;
}

function requireActiveUser(user: User | null): User {
  if (user === null || !user.isActive) {
    throw new AppError(INVALID_SESSION_MESSAGE, 401);
  }
  return user;
}

function issueTokens(user: TokenSubject): AuthTokens {
  return {
    accessToken: signAccessToken({ sub: user.id, username: user.username, role: user.role }),
    refreshToken: signRefreshToken({ sub: user.id }),
    role: user.role,
  };
}

export interface LoginResult {
  user: UserDto;
  tokens: AuthTokens;
}

export async function login(username: string, password: string): Promise<LoginResult> {
  const user = await prisma.user.findUnique({ where: { username } });
  if (user === null) {
    throw new AppError(INVALID_CREDENTIALS_MESSAGE, 401);
  }
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new AppError(INVALID_CREDENTIALS_MESSAGE, 401);
  }
  if (!user.isActive) {
    throw new AppError("Akun dinonaktifkan", 403);
  }
  return {
    user: toUserDto(user),
    tokens: issueTokens({ id: user.id, username: user.username, role: user.role }),
  };
}

export async function getCurrentUser(userId: string): Promise<UserDto> {
  const user = requireActiveUser(await prisma.user.findUnique({ where: { id: userId } }));
  return toUserDto(user);
}

export interface RefreshResult {
  user: UserDto;
  accessToken: string;
}

export async function refresh(refreshToken: string): Promise<RefreshResult> {
  const payload = verifyRefreshToken(refreshToken);
  const user = requireActiveUser(await prisma.user.findUnique({ where: { id: payload.sub } }));
  return {
    user: toUserDto(user),
    accessToken: signAccessToken({ sub: user.id, username: user.username, role: user.role }),
  };
}

export async function changePassword(userId: string, input: ChangePasswordBody): Promise<void> {
  const user = requireActiveUser(await prisma.user.findUnique({ where: { id: userId } }));
  const isValid = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!isValid) {
    throw new AppError("Password lama salah", 400);
  }
  const passwordHash = await hashPassword(input.newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}
