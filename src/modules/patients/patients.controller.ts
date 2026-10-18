import type { Request, Response } from "express";
import { requireRouteParam } from "../../helpers/request";
import { ok } from "../../helpers/respond";
import { requireUser } from "../../middlewares/auth";
import * as patientsService from "./patients.service";
import type { CreatePatientBody, ListPatientsQuery, UpdatePatientBody } from "./validators/patients.validator";

export async function listPatientsHandler(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListPatientsQuery;
  const result = await patientsService.listPatients(query);
  ok(res, "Daftar pasien", result);
}

export async function getPatientHandler(req: Request, res: Response): Promise<void> {
  const id = requireRouteParam(req, "id");
  const patient = await patientsService.getPatient(id);
  ok(res, "Detail pasien", patient);
}

export async function createPatientHandler(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req);
  const body = req.body as CreatePatientBody;
  const patient = await patientsService.createPatient(body, actor.id);
  ok(res, "Pasien berhasil didaftarkan", patient, 201);
}

export async function updatePatientHandler(req: Request, res: Response): Promise<void> {
  const id = requireRouteParam(req, "id");
  const body = req.body as UpdatePatientBody;
  const patient = await patientsService.updatePatient(id, body);
  ok(res, "Data pasien berhasil diperbarui", patient);
}

export async function deletePatientHandler(req: Request, res: Response): Promise<void> {
  const id = requireRouteParam(req, "id");
  await patientsService.deletePatient(id);
  ok(res, "Pasien berhasil dihapus");
}
