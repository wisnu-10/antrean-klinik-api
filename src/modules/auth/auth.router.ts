import { Router } from "express";
import { jwtVerify } from "../../middlewares/auth";
import { loginLimiter } from "../../middlewares/rateLimit";
import { validate } from "../../middlewares/validate";
import {
  changePasswordHandler,
  loginHandler,
  logoutHandler,
  meHandler,
  refreshHandler,
} from "./auth.controller";
import { changePasswordSchema, loginSchema } from "./validators/auth.validator";

const router = Router();

router.post("/login", loginLimiter, validate({ body: loginSchema }), loginHandler);
router.post("/logout", logoutHandler);
router.post("/refresh", refreshHandler);
router.get("/me", jwtVerify, meHandler);
router.patch("/password", jwtVerify, validate({ body: changePasswordSchema }), changePasswordHandler);

export default router;
