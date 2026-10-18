import type { User } from "../../../generated/prisma/client";
import type { UserRole } from "../../types/auth";

export interface UserDto {
  id: string;
  username: string;
  nama: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

type UserDtoSource = Pick<User, "id" | "username" | "nama" | "role" | "isActive" | "createdAt">;

export function toUserDto(user: UserDtoSource): UserDto {
  return {
    id: user.id,
    username: user.username,
    nama: user.nama,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
  };
}
