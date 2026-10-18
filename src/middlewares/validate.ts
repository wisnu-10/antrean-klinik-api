import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodError, ZodType } from "zod";
import { ValidationError, type FieldError } from "../helpers/AppError";

interface ValidateSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

function toFieldErrors(error: ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.map((segment) => String(segment)).join(".") : "_",
    message: issue.message,
  }));
}

export function validate(schemas: ValidateSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: FieldError[] = [];

    if (schemas.body !== undefined) {
      const result = schemas.body.safeParse(req.body);
      if (result.success) {
        req.body = result.data;
      } else {
        errors.push(...toFieldErrors(result.error));
      }
    }

    if (schemas.query !== undefined) {
      const result = schemas.query.safeParse(req.query);
      if (result.success) {
        req.validatedQuery = result.data;
      } else {
        errors.push(...toFieldErrors(result.error));
      }
    }

    if (schemas.params !== undefined) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        errors.push(...toFieldErrors(result.error));
      }
    }

    if (errors.length > 0) {
      next(new ValidationError(errors));
      return;
    }

    next();
  };
}
