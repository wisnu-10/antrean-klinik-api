import type { Request } from "express";
import { AppError } from "./AppError";

export function requireRouteParam(req: Request, name: string): string {
  const value: unknown = req.params[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new AppError(`Parameter ${name} tidak valid`, 400);
  }
  return value;
}
