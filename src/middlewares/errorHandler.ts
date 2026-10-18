import type { NextFunction, Request, Response } from "express";
import { AppError, ValidationError, errorEnvelope } from "../helpers/AppError";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) {
    return;
  }
  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.expose ? err.message : "Internal Server Error",
      data: null,
      errors: err.errors,
    });
    return;
  }
  if (err instanceof AppError) {
    const message = err.expose ? err.message : "Internal Server Error";
    const statusCode = err.expose ? err.statusCode : 500;
    res.status(statusCode).json(errorEnvelope(message));
    return;
  }
  process.stderr.write(`Unhandled error: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  res.status(500).json(errorEnvelope("Internal Server Error"));
}
