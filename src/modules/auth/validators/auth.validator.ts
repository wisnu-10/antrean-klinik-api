import { z } from "zod";

export const loginSchema = z.strictObject({
  username: z.string().trim().min(1, "Username wajib diisi").max(50, "Username maksimal 50 karakter"),
  password: z.string().min(1, "Password wajib diisi").max(100, "Password maksimal 100 karakter"),
});

export const changePasswordSchema = z.strictObject({
  currentPassword: z.string().min(1, "Password lama wajib diisi").max(100),
  newPassword: z
    .string()
    .min(8, "Password baru minimal 8 karakter")
    .max(100, "Password baru maksimal 100 karakter"),
});

export type LoginBody = z.infer<typeof loginSchema>;
export type ChangePasswordBody = z.infer<typeof changePasswordSchema>;
