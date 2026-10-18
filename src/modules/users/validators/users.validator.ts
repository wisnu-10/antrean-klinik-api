import { z } from "zod";
import {
  nameSchema,
  passwordSchema,
  usernameSchema,
} from "../../common/validators";

export const userIdParamSchema = z.object({
  id: z.uuid("ID tidak valid"),
});

export const createUserSchema = z.strictObject({
  username: usernameSchema,
  nama: nameSchema,
  password: passwordSchema,
});

export const updateUserSchema = z
  .strictObject({
    username: usernameSchema.optional(),
    nama: nameSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => data.username !== undefined || data.nama !== undefined || data.isActive !== undefined,
    { message: "Tidak ada perubahan yang dikirim" },
  );

export const resetPasswordSchema = z.strictObject({
  newPassword: passwordSchema,
});

export type CreateUserBody = z.infer<typeof createUserSchema>;
export type UpdateUserBody = z.infer<typeof updateUserSchema>;
export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>;
