import type { Response } from "express";

export interface SuccessEnvelope {
  success: true;
  message: string;
  data: unknown;
}

export function ok(res: Response, message: string, data: unknown = null, statusCode = 200): void {
  const body: SuccessEnvelope = { success: true, message, data };
  res.status(statusCode).json(body);
}
