import { Router } from "express";
import { jwtVerify, roleverify } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import {
  createUserHandler,
  deactivateUserHandler,
  listUsersHandler,
  resetPasswordHandler,
  updateUserHandler,
} from "./users.controller";
import {
  createUserSchema,
  resetPasswordSchema,
  updateUserSchema,
  userIdParamSchema,
} from "./validators/users.validator";

const router = Router();

router.use(jwtVerify, roleverify(["superadmin"]));

router.get("/", listUsersHandler);
router.post("/", validate({ body: createUserSchema }), createUserHandler);
router.patch("/:id", validate({ params: userIdParamSchema, body: updateUserSchema }), updateUserHandler);
router.post(
  "/:id/reset-password",
  validate({ params: userIdParamSchema, body: resetPasswordSchema }),
  resetPasswordHandler,
);
router.delete("/:id", validate({ params: userIdParamSchema }), deactivateUserHandler);

export default router;
