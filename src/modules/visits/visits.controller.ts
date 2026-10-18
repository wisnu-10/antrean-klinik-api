import type { Request, Response } from "express";
import { requireRouteParam } from "../../helpers/request";
import { ok } from "../../helpers/respond";
import { requireUser } from "../../middlewares/auth";
import * as visitsService from "./visits.service";
import type { CreateVisitBody, ListVisitsQuery, UpdateVisitBody } from "./validators/visits.validator";

export async function listVisitsHandler(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListVisitsQuery;
  const result = await visitsService.listVisits(query);
  ok(res, "Daftar kunjungan", result);
}

export async function getVisitHandler(req: Request, res: Response): Promise<void> {
  const id = requireRouteParam(req, "id");
  const visit = await visitsService.getVisit(id);
  ok(res, "Detail kunjungan", visit);
}

export async function createVisitHandler(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req);
  const body = req.body as CreateVisitBody;
  const visit = await visitsService.createVisit(body, actor.id);
  ok(res, "Kunjungan berhasil dibuat", visit, 201);
}

export async function updateVisitHandler(req: Request, res: Response): Promise<void> {
  const id = requireRouteParam(req, "id");
  const body = req.body as UpdateVisitBody;
  const visit = await visitsService.updateVisit(id, body);
  ok(res, "Kunjungan berhasil diperbarui", visit);
}

export async function deleteVisitHandler(req: Request, res: Response): Promise<void> {
  const id = requireRouteParam(req, "id");
  await visitsService.deleteVisit(id);
  ok(res, "Kunjungan berhasil dihapus");
}
