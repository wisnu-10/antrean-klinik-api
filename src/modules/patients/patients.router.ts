import { Router } from "express";
import { jwtVerify, roleverify } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import {
  createPatientHandler,
  deletePatientHandler,
  getPatientHandler,
  listPatientsHandler,
  updatePatientHandler,
} from "./patients.controller";
import {
  createPatientSchema,
  listPatientsQuerySchema,
  patientIdParamSchema,
  patientIdentifierParamSchema,
  updatePatientSchema,
} from "./validators/patients.validator";

const router = Router();

// Data pasien hanya dioperasikan oleh admin (superadmin hanya mengelola akun, PRD 3).
router.use(jwtVerify, roleverify(["admin"]));

router.get("/", validate({ query: listPatientsQuerySchema }), listPatientsHandler);
router.post("/", validate({ body: createPatientSchema }), createPatientHandler);
router.get("/:id", validate({ params: patientIdentifierParamSchema }), getPatientHandler);
router.patch("/:id", validate({ params: patientIdParamSchema, body: updatePatientSchema }), updatePatientHandler);
router.delete("/:id", validate({ params: patientIdParamSchema }), deletePatientHandler);

export default router;
