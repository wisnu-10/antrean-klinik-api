import { Router } from "express";
import { jwtVerify, roleverify } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import {
  createVisitHandler,
  deleteVisitHandler,
  getVisitHandler,
  listVisitsHandler,
  updateVisitHandler,
} from "./visits.controller";
import {
  createVisitSchema,
  listVisitsQuerySchema,
  updateVisitSchema,
  visitIdParamSchema,
} from "./validators/visits.validator";

const router = Router();

// Antrean & kunjungan hanya dioperasikan admin (PRD 3, 5.4).
router.use(jwtVerify, roleverify(["admin"]));

router.get("/", validate({ query: listVisitsQuerySchema }), listVisitsHandler);
router.post("/", validate({ body: createVisitSchema }), createVisitHandler);
router.get("/:id", validate({ params: visitIdParamSchema }), getVisitHandler);
router.patch("/:id", validate({ params: visitIdParamSchema, body: updateVisitSchema }), updateVisitHandler);
router.delete("/:id", validate({ params: visitIdParamSchema }), deleteVisitHandler);

export default router;
