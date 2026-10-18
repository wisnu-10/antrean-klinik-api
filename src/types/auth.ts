export const USER_ROLES = ["superadmin", "admin"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
}
